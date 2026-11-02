//! Claude API access. The API key lives in the OS credential store and is only ever read here,
//! so it never reaches the webview, `data.json` or an export.

use std::{io::Read, time::Duration};

const KEYRING_SERVICE: &str = "gamedev-dashboard";
const KEYRING_USER: &str = "anthropic-api-key";
const API_URL: &str = "https://api.anthropic.com/v1/messages";
const API_VERSION: &str = "2023-06-01";
const MAX_REQUEST_BYTES: usize = 400_000;
const MAX_RESPONSE_BYTES: u64 = 8 * 1024 * 1024;
const TIMEOUT_SECS: u64 = 170;

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

/// Anthropic keys are ASCII and well under 300 characters; anything else is a paste mistake.
pub(crate) fn validate_key(key: &str) -> Result<&str, String> {
    let key = key.trim();
    if key.len() < 20 || key.len() > 300 || !key.is_ascii() || key.chars().any(|c| c.is_whitespace()) {
        return Err("That does not look like an API key.".into());
    }
    Ok(key)
}

#[tauri::command]
pub fn claude_set_key(key: String) -> Result<(), String> {
    let key = validate_key(&key)?;
    entry()?.set_password(key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn claude_has_key() -> bool {
    entry().and_then(|e| e.get_password().map_err(|e| e.to_string())).is_ok()
}

#[tauri::command]
pub fn claude_clear_key() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn read_limited(resp: ureq::Response) -> Result<String, String> {
    let mut text = String::new();
    resp.into_reader()
        .take(MAX_RESPONSE_BYTES)
        .read_to_string(&mut text)
        .map_err(|e| format!("could not read response: {e}"))?;
    Ok(text)
}

/// The body must be a JSON object. Everything else (URL, headers, key) is fixed here.
pub(crate) fn validate_body(body: &str) -> Result<(), String> {
    if body.len() > MAX_REQUEST_BYTES {
        return Err("request too large".into());
    }
    match serde_json::from_str::<serde_json::Value>(body) {
        Ok(v) if v.is_object() => Ok(()),
        _ => Err("request body must be a JSON object".into()),
    }
}

fn request_blocking(body: String) -> Result<String, String> {
    validate_body(&body)?;
    let key = entry()?
        .get_password()
        .map_err(|_| "No API key saved. Add one in Settings.".to_string())?;
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .build();
    let result = agent
        .post(API_URL)
        .set("x-api-key", &key)
        .set("anthropic-version", API_VERSION)
        .set("content-type", "application/json")
        .send_string(&body);
    match result {
        Ok(resp) => read_limited(resp),
        // Error bodies from the API are JSON describing the problem; they never contain the key.
        Err(ureq::Error::Status(code, resp)) => {
            let text = read_limited(resp).unwrap_or_default();
            Err(format!("HTTP {code}: {}", text.chars().take(600).collect::<String>()))
        }
        Err(ureq::Error::Transport(t)) => Err(format!("network error: {:?}", t.kind())),
    }
}

/// Sends one Messages API request and returns the raw JSON response.
#[tauri::command]
pub async fn claude_request(body: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || request_blocking(body))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plausible_keys_only() {
        assert!(validate_key("sk-ant-api03-abcdefghijklmnopqrstuvwxyz").is_ok());
        assert!(validate_key("  sk-ant-api03-abcdefghijklmnopqrstuvwxyz \n").is_ok());
        assert!(validate_key("short").is_err());
        assert!(validate_key("sk-ant with spaces inside the key value").is_err());
        assert!(validate_key("sk-ant-api03-äöüabcdefghijklmnopqrstuvwxyz").is_err());
    }

    #[test]
    fn body_must_be_a_json_object() {
        assert!(validate_body(r#"{"model":"x"}"#).is_ok());
        assert!(validate_body("[1,2]").is_err());
        assert!(validate_body("not json").is_err());
        assert!(validate_body(&format!("{{\"a\":\"{}\"}}", "x".repeat(MAX_REQUEST_BYTES))).is_err());
    }
}
