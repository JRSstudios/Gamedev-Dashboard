use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use tauri::{Emitter, Manager};

mod bridge;
mod claude;
mod claude_cli;
mod installer;
mod models;
mod snapshots;
mod templates;
mod transfer;
mod unity_scan;

const MAX_DATA_BYTES: usize = 64 * 1024 * 1024;
const MAX_PREVIEW_BYTES: u64 = 25 * 1024 * 1024;
const PREVIEW_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "mp3", "wav", "ogg", "opus", "flac", "m4a",
    "aac", "kra",
];
const EXPORT_EXTENSIONS: &[&str] = &["json", "md"];

fn extension(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default()
}

fn data_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("data.json"))
}

/// Reads data.json. A copy of a healthy file is kept as data.backup.json on every start.
#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = data_file(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if serde_json::from_str::<serde_json::Value>(&text).is_ok() {
        let _ = fs::copy(&path, path.with_file_name("data.backup.json"));
    }
    Ok(Some(text))
}

/// Atomic write: temp file in the same folder, fsync, then rename over the target.
#[tauri::command]
fn save_data(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    if contents.len() > MAX_DATA_BYTES {
        return Err("data too large".into());
    }
    if serde_json::from_str::<serde_json::Value>(&contents).is_err() {
        return Err("refusing to save invalid JSON".into());
    }
    let path = data_file(&app)?;
    let tmp = path.with_file_name("data.json.tmp");
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    file.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

/// Which linked asset files still exist (used to flag moved or deleted files).
#[tauri::command]
fn paths_exist(paths: Vec<String>) -> Vec<bool> {
    paths.iter().map(|p| Path::new(p).is_file()).collect()
}

/// Bytes of an image or audio file for thumbnails and playback. Type and size are restricted.
#[tauri::command]
fn read_preview(path: String) -> Result<tauri::ipc::Response, String> {
    let p = Path::new(&path);
    if !PREVIEW_EXTENSIONS.contains(&extension(p).as_str()) {
        return Err("unsupported file type".into());
    }
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    if !meta.is_file() || meta.len() > MAX_PREVIEW_BYTES {
        return Err("not a readable file or too large".into());
    }
    // Krita files are ZIP archives; the preview is the flattened image inside.
    let bytes = if extension(p) == "kra" { models::kra_preview(p)? } else { fs::read(p).map_err(|e| e.to_string())? };
    Ok(tauri::ipc::Response::new(bytes))
}

/// Used for export. The path always comes from the native save dialog; only .json/.md are allowed.
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !EXPORT_EXTENSIONS.contains(&extension(p).as_str()) || contents.len() > MAX_DATA_BYTES {
        return Err("not allowed".into());
    }
    fs::write(p, contents).map_err(|e| e.to_string())
}

/// Used for import. The path always comes from the native open dialog; only .json is allowed.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if extension(p) != "json" {
        return Err("not allowed".into());
    }
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    if meta.len() > MAX_DATA_BYTES as u64 {
        return Err("file too large".into());
    }
    fs::read_to_string(p).map_err(|e| e.to_string())
}

/// Navigation targets the main window may load: the bundled app, and the dev server in debug builds.
pub(crate) fn allowed_navigation(url: &tauri::Url) -> bool {
    let host = url.host_str().unwrap_or("");
    match url.scheme() {
        "tauri" | "asset" => true,
        "http" | "https" if host == "tauri.localhost" => true,
        "http" if cfg!(debug_assertions) && (host == "localhost" || host == "127.0.0.1") && url.port() == Some(1420) => true,
        _ => false,
    }
}

/// The crash message from the last run, if the app panicked; reading it removes it.
#[tauri::command]
fn take_crash_log(app: tauri::AppHandle) -> Option<String> {
    let path = app.path().app_data_dir().ok()?.join("crash.log");
    let text = fs::read_to_string(&path).ok()?;
    let _ = fs::remove_file(&path);
    Some(text.chars().take(16_000).collect())
}

/// Brings the main window to the front, also when it is minimized or hidden.
fn reveal_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must come first: a second start hands over to the running window instead of
        // starting another app that would fight over data.json, the bridge and the shortcut.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| reveal_main(app)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(bridge::Bridge(std::sync::Mutex::new(bridge::Inner::new(String::new()))))
        .plugin(
            // The window only ever shows the bundled app. A link or script that tries to navigate it
            // elsewhere is blocked; external links open in the system browser through the opener plugin.
            tauri::plugin::Builder::<tauri::Wry>::new("navigation-guard")
                .on_navigation(|_webview, url| allowed_navigation(url))
                .build(),
        )
        .plugin(
            // Ctrl+Shift+Space brings the window up with a quick note, even from another program.
            // The shortcut itself is registered in setup, so a shortcut held by another program
            // only costs the quick note instead of stopping the app.
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        reveal_main(app);
                        let _ = app.emit("quick-note", ());
                    }
                })
                .build(),
        )
        .setup(|app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            if let Err(e) = app.global_shortcut().register("ctrl+shift+space") {
                eprintln!("quick note shortcut not registered: {e}");
            }
            // Release builds abort on panic; the message is kept so the next start can offer a bug report.
            if let Ok(dir) = app.path().app_data_dir() {
                let crash = dir.join("crash.log");
                let _ = fs::create_dir_all(&dir);
                std::panic::set_hook(Box::new(move |info| {
                    let _ = fs::write(&crash, format!("{info}\n{}", std::backtrace::Backtrace::force_capture()));
                }));
            }
            // The plugins are optional; without the bridge the dashboard works as before.
            if let Err(e) = bridge::start(app.handle()) {
                eprintln!("bridge not started: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            paths_exist,
            read_preview,
            write_text_file,
            read_text_file,
            take_crash_log,
            claude::claude_set_key,
            claude::claude_has_key,
            claude::claude_clear_key,
            claude::claude_request,
            claude_cli::claude_cli_status,
            claude_cli::claude_cli_request,
            transfer::inspect_unity_project,
            transfer::copy_into_folder,
            transfer::list_folder,
            transfer::open_in_app,
            models::read_model_file,
            models::blend_to_glb,
            bridge::bridge_info,
            bridge::bridge_set_enabled,
            bridge::bridge_set_config,
            bridge::bridge_enqueue,
            installer::install_unity_plugin,
            installer::install_blender_addon,
            installer::install_krita_plugin,
            installer::uninstall_plugin,
            installer::plugin_status,
            templates::templates_fetch,
            templates::write_unity_script,
            snapshots::snapshot_now,
            snapshots::list_snapshots,
            snapshots::read_snapshot,
            unity_scan::scan_unity_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running Gamedev Dashboard");
}

#[cfg(test)]
mod tests {
    use super::allowed_navigation;

    #[test]
    fn only_the_bundled_app_may_load() {
        for ok in ["http://tauri.localhost/index.html", "https://tauri.localhost/", "tauri://localhost/"] {
            assert!(allowed_navigation(&ok.parse().unwrap()), "{ok}");
        }
        for bad in ["https://evil.example/", "http://127.0.0.1:9999/", "file:///C:/Windows/win.ini", "javascript:alert(1)"] {
            assert!(!allowed_navigation(&bad.parse().unwrap()), "{bad}");
        }
    }
}
