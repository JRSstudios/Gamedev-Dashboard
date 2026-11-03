//! Local bridge for the Unity, Blender and Krita plugins.
//!
//! A tiny HTTP server on 127.0.0.1 with a random port and token. Port and token are written to
//! `bridge.json` in the app data folder, which only the current user can read. The plugins send
//! events (an export finished, a Unity error) and poll for jobs the user started in the dashboard.
//! Only fixed event and job types are accepted; nothing here runs code.

use serde_json::{json, Map, Value};
use std::{
    collections::{HashMap, VecDeque},
    fs,
    io::Read,
    sync::Mutex,
    time::{Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};

pub const APPS: &[&str] = &["unity", "blender", "krita"];
const MAX_BODY: usize = 256 * 1024;
const MAX_CONFIG: usize = 64 * 1024;
const MAX_QUEUE: usize = 50;
const MAX_REQUESTS_PER_SECOND: u32 = 60;

fn event_types(app: &str) -> &'static [&'static str] {
    match app {
        "unity" => &["log", "scenes", "compiled", "imported", "build"],
        "blender" => &["exported", "check"],
        "krita" => &["exported"],
        _ => &[],
    }
}

fn job_types(app: &str) -> &'static [&'static str] {
    match app {
        "unity" => &["import", "refresh", "create_prefab", "open_scene", "presets"],
        "blender" => &["export", "check"],
        "krita" => &["export_png", "export_layers"],
        _ => &[],
    }
}

pub struct Inner {
    pub port: u16,
    pub token: String,
    pub enabled: bool,
    config: Value,
    queues: HashMap<String, VecDeque<Value>>,
    seen: HashMap<String, u64>,
    window_start: Option<Instant>,
    window_count: u32,
}

impl Inner {
    pub fn new(token: String) -> Self {
        Inner {
            port: 0,
            token,
            enabled: true,
            config: json!({}),
            queues: HashMap::new(),
            seen: HashMap::new(),
            window_start: None,
            window_count: 0,
        }
    }
}

pub struct Bridge(pub Mutex<Inner>);

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn random_token() -> Result<String, String> {
    let mut bytes = [0u8; 24];
    getrandom::getrandom(&mut bytes).map_err(|e| e.to_string())?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

/// Constant-time comparison so the token cannot be guessed byte by byte from timings.
fn same_token(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// What the HTTP layer sends back, plus an optional event for the window.
pub struct Reply {
    pub status: u16,
    pub body: Value,
    pub event: Option<Value>,
}

fn reply(status: u16, body: Value) -> Reply {
    Reply { status, body, event: None }
}

fn app_config(inner: &Inner, app: &str) -> Value {
    inner.config.get(app).cloned().unwrap_or_else(|| json!({}))
}

/// Request handling without any I/O, so it can be unit tested.
pub fn handle(inner: &mut Inner, method: &str, url: &str, token: Option<&str>, has_origin: bool, body: &[u8]) -> Reply {
    // Browsers always send Origin; plugins never do. This keeps web pages away from the bridge.
    if has_origin {
        return reply(403, json!({ "error": "forbidden" }));
    }
    if !token.is_some_and(|t| same_token(t, &inner.token)) {
        return reply(401, json!({ "error": "bad token" }));
    }
    if !inner.enabled {
        return reply(503, json!({ "error": "bridge is switched off in the dashboard" }));
    }
    let now = Instant::now();
    match inner.window_start {
        Some(start) if now.duration_since(start).as_secs() < 1 => {
            inner.window_count += 1;
            if inner.window_count > MAX_REQUESTS_PER_SECOND {
                return reply(429, json!({ "error": "too many requests" }));
            }
        }
        _ => {
            inner.window_start = Some(now);
            inner.window_count = 1;
        }
    }
    if body.len() > MAX_BODY {
        return reply(413, json!({ "error": "too large" }));
    }

    let (path, query) = url.split_once('?').unwrap_or((url, ""));
    match (method, path) {
        ("GET", "/v1/pull") => {
            let app = query.split('&').find_map(|kv| kv.strip_prefix("app=")).unwrap_or("");
            if !APPS.contains(&app) {
                return reply(400, json!({ "error": "unknown app" }));
            }
            inner.seen.insert(app.to_string(), now_secs());
            let queue = inner.queues.entry(app.to_string()).or_default();
            let jobs: Vec<Value> = queue.drain(..queue.len().min(10)).collect();
            reply(200, json!({ "jobs": jobs, "config": app_config(inner, app) }))
        }
        ("POST", "/v1/hello") | ("POST", "/v1/event") => {
            let Ok(Value::Object(msg)) = serde_json::from_slice::<Value>(body) else {
                return reply(400, json!({ "error": "expected a JSON object" }));
            };
            let app = msg.get("app").and_then(Value::as_str).unwrap_or("");
            if !APPS.contains(&app) {
                return reply(400, json!({ "error": "unknown app" }));
            }
            inner.seen.insert(app.to_string(), now_secs());
            if path == "/v1/hello" {
                let version = msg.get("version").and_then(Value::as_str).unwrap_or("").chars().take(40).collect::<String>();
                let mut r = reply(200, json!({ "ok": true, "config": app_config(inner, app) }));
                r.event = Some(json!({ "app": app, "type": "hello", "data": { "version": version }, "at": now_secs() }));
                return r;
            }
            let kind = msg.get("type").and_then(Value::as_str).unwrap_or("");
            if !event_types(app).contains(&kind) {
                return reply(400, json!({ "error": "unknown event type" }));
            }
            let data = match msg.get("data") {
                Some(Value::Object(d)) => Value::Object(d.clone()),
                None => Value::Object(Map::new()),
                _ => return reply(400, json!({ "error": "data must be an object" })),
            };
            let mut r = reply(200, json!({ "ok": true }));
            r.event = Some(json!({ "app": app, "type": kind, "data": data, "at": now_secs() }));
            r
        }
        _ => reply(404, json!({ "error": "not found" })),
    }
}

/// Queues a job for a plugin. Only known job types; old jobs drop out when the plugin is not running.
pub fn enqueue(inner: &mut Inner, app: &str, job: Value) -> Result<(), String> {
    if !APPS.contains(&app) {
        return Err("unknown app".into());
    }
    let kind = job.get("type").and_then(Value::as_str).unwrap_or("");
    if !job_types(app).contains(&kind) {
        return Err("unknown job type".into());
    }
    if serde_json::to_vec(&job).map(|b| b.len()).unwrap_or(usize::MAX) > MAX_BODY {
        return Err("job too large".into());
    }
    let queue = inner.queues.entry(app.to_string()).or_default();
    if queue.len() >= MAX_QUEUE {
        queue.pop_front();
    }
    queue.push_back(job);
    Ok(())
}

/// Starts the server thread and writes bridge.json. Failures only disable the bridge.
pub fn start(app: &tauri::AppHandle) -> Result<(), String> {
    let token = random_token()?;
    let server = tiny_http::Server::http("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = server.server_addr().to_ip().map(|a| a.port()).ok_or("no port")?;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("bridge.json"), json!({ "port": port, "token": token, "pid": std::process::id() }).to_string()).map_err(|e| e.to_string())?;

    let state = app.state::<Bridge>();
    {
        let mut inner = state.0.lock().map_err(|e| e.to_string())?;
        inner.token = token;
        inner.port = port;
    }
    let app_handle = app.clone();
    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let method = request.method().as_str().to_uppercase();
            let url = request.url().to_string();
            let header = |name: &str| request.headers().iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case(name)).map(|h| h.value.as_str().to_string());
            let token = header("X-GD-Token");
            let has_origin = header("Origin").is_some();
            let mut body = Vec::new();
            let _ = request.as_reader().take(MAX_BODY as u64 + 1).read_to_end(&mut body);
            let result = {
                let bridge = app_handle.state::<Bridge>();
                let mut inner = match bridge.0.lock() {
                    Ok(i) => i,
                    Err(_) => continue,
                };
                handle(&mut inner, &method, &url, token.as_deref(), has_origin, &body)
            };
            if let Some(event) = result.event {
                let _ = app_handle.emit("bridge-event", event);
            }
            let response = tiny_http::Response::from_string(result.body.to_string())
                .with_status_code(result.status)
                .with_header(tiny_http::Header::from_bytes("Content-Type", "application/json").expect("static header"));
            let _ = request.respond(response);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn bridge_info(state: tauri::State<Bridge>) -> Result<Value, String> {
    let inner = state.0.lock().map_err(|e| e.to_string())?;
    Ok(json!({ "running": inner.port != 0, "port": inner.port, "enabled": inner.enabled, "seen": inner.seen }))
}

#[tauri::command]
pub fn bridge_set_enabled(state: tauri::State<Bridge>, enabled: bool) -> Result<(), String> {
    state.0.lock().map_err(|e| e.to_string())?.enabled = enabled;
    Ok(())
}

/// Per-app settings the plugins receive (export folders, auto export, import presets).
#[tauri::command]
pub fn bridge_set_config(state: tauri::State<Bridge>, config: Value) -> Result<(), String> {
    if !config.is_object() || config.to_string().len() > MAX_CONFIG {
        return Err("invalid config".into());
    }
    state.0.lock().map_err(|e| e.to_string())?.config = config;
    Ok(())
}

#[tauri::command]
pub fn bridge_enqueue(state: tauri::State<Bridge>, app: String, job: Value) -> Result<(), String> {
    enqueue(&mut *state.0.lock().map_err(|e| e.to_string())?, &app, job)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inner() -> Inner {
        Inner::new("secret".into())
    }

    #[test]
    fn rejects_missing_or_wrong_token_and_browsers() {
        let mut i = inner();
        assert_eq!(handle(&mut i, "GET", "/v1/pull?app=unity", None, false, b"").status, 401);
        assert_eq!(handle(&mut i, "GET", "/v1/pull?app=unity", Some("nope"), false, b"").status, 401);
        assert_eq!(handle(&mut i, "GET", "/v1/pull?app=unity", Some("secret"), true, b"").status, 403);
        assert_eq!(handle(&mut i, "GET", "/v1/pull?app=unity", Some("secret"), false, b"").status, 200);
    }

    #[test]
    fn accepts_only_known_apps_and_events() {
        let mut i = inner();
        let ok = handle(&mut i, "POST", "/v1/event", Some("secret"), false, br#"{"app":"blender","type":"exported","data":{"path":"a.glb"}}"#);
        assert_eq!(ok.status, 200);
        assert_eq!(ok.event.unwrap()["data"]["path"], "a.glb");
        assert_eq!(handle(&mut i, "POST", "/v1/event", Some("secret"), false, br#"{"app":"blender","type":"run","data":{}}"#).status, 400);
        assert_eq!(handle(&mut i, "POST", "/v1/event", Some("secret"), false, br#"{"app":"photoshop","type":"exported"}"#).status, 400);
        assert_eq!(handle(&mut i, "POST", "/v1/event", Some("secret"), false, b"not json").status, 400);
        assert_eq!(handle(&mut i, "POST", "/v1/event", Some("secret"), false, &vec![b' '; MAX_BODY + 1]).status, 413);
    }

    #[test]
    fn hello_returns_config_and_marks_app_seen() {
        let mut i = inner();
        i.config = json!({ "krita": { "exportDir": "C:/art" } });
        let r = handle(&mut i, "POST", "/v1/hello", Some("secret"), false, br#"{"app":"krita","version":"1.0"}"#);
        assert_eq!(r.body["config"]["exportDir"], "C:/art");
        assert!(i.seen.contains_key("krita"));
    }

    #[test]
    fn jobs_are_queued_and_pulled_once() {
        let mut i = inner();
        assert!(enqueue(&mut i, "unity", json!({ "type": "refresh" })).is_ok());
        assert!(enqueue(&mut i, "unity", json!({ "type": "run_code", "code": "x" })).is_err());
        assert!(enqueue(&mut i, "maya", json!({ "type": "refresh" })).is_err());
        let first = handle(&mut i, "GET", "/v1/pull?app=unity", Some("secret"), false, b"");
        assert_eq!(first.body["jobs"].as_array().unwrap().len(), 1);
        let second = handle(&mut i, "GET", "/v1/pull?app=unity", Some("secret"), false, b"");
        assert_eq!(second.body["jobs"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn switched_off_bridge_refuses_requests() {
        let mut i = inner();
        i.enabled = false;
        assert_eq!(handle(&mut i, "GET", "/v1/pull?app=unity", Some("secret"), false, b"").status, 503);
    }
}
