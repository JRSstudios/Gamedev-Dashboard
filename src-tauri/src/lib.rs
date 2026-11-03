use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use tauri::Manager;

mod bridge;
mod claude;
mod claude_cli;
mod installer;
mod models;
mod templates;
mod transfer;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(bridge::Bridge(std::sync::Mutex::new(bridge::Inner::new(String::new()))))
        .setup(|app| {
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
            templates::write_unity_script
        ])
        .run(tauri::generate_context!())
        .expect("error while running Gamedev Dashboard");
}
