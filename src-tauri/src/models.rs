//! 3D model files for the preview, Krita thumbnails and the optional .blend -> .glb conversion.
//! Everything here only reads user files; the conversion writes into the app cache folder.

use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::Command,
    time::{Duration, Instant, UNIX_EPOCH},
};
use tauri::Manager;

const MAX_MODEL_BYTES: u64 = 200 * 1024 * 1024;
const MAX_KRA_PREVIEW_BYTES: u64 = 40 * 1024 * 1024;
const BLEND_TIMEOUT: Duration = Duration::from_secs(180);
pub(crate) const MODEL_EXTENSIONS: &[&str] = &["glb", "gltf", "bin", "fbx", "obj", "mtl", "png", "jpg", "jpeg"];

fn extension(path: &Path) -> String {
    path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase()
}

/// `path` must have a model-related extension and, when `base` is given, live inside the folder
/// of `base` (a glTF may only pull its own textures and buffers, never arbitrary files).
pub(crate) fn check_model_path(path: &Path, base: Option<&Path>) -> Result<PathBuf, String> {
    if !MODEL_EXTENSIONS.contains(&extension(path).as_str()) {
        return Err("unsupported file type".into());
    }
    let canon = fs::canonicalize(path).map_err(|_| "file not found".to_string())?;
    if let Some(base) = base {
        let dir = fs::canonicalize(base)
            .map_err(|_| "model not found".to_string())?
            .parent()
            .map(Path::to_path_buf)
            .ok_or("invalid model path")?;
        if !canon.starts_with(&dir) {
            return Err("file is outside the model folder".into());
        }
    }
    let meta = fs::metadata(&canon).map_err(|e| e.to_string())?;
    if !meta.is_file() || meta.len() > MAX_MODEL_BYTES {
        return Err("not a readable file or too large".into());
    }
    Ok(canon)
}

#[tauri::command]
pub fn read_model_file(path: String, base: Option<String>) -> Result<tauri::ipc::Response, String> {
    let canon = check_model_path(Path::new(&path), base.as_deref().map(Path::new))?;
    let bytes = fs::read(canon).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Krita files are ZIP archives with a flattened `mergedimage.png`; only that entry is read.
pub(crate) fn kra_preview(path: &Path) -> Result<Vec<u8>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|_| "not a Krita file".to_string())?;
    let entry = archive.by_name("mergedimage.png").map_err(|_| "no preview in this Krita file".to_string())?;
    if entry.size() > MAX_KRA_PREVIEW_BYTES {
        return Err("preview too large".into());
    }
    let mut out = Vec::with_capacity(entry.size() as usize);
    entry.take(MAX_KRA_PREVIEW_BYTES).read_to_end(&mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

/// Fixed export script; the output path is the only argument Blender receives after `--`.
const BLEND_EXPORT_SCRIPT: &str =
    "import bpy, sys; out = sys.argv[sys.argv.index('--') + 1]; bpy.ops.export_scene.gltf(filepath=out, export_format='GLB')";

pub(crate) fn blend_args(blend: &Path, out: &Path) -> Vec<std::ffi::OsString> {
    vec![
        "-b".into(),
        blend.as_os_str().to_owned(),
        "--python-expr".into(),
        BLEND_EXPORT_SCRIPT.into(),
        "--".into(),
        out.as_os_str().to_owned(),
    ]
}

/// Cache file name from the path and modification time, so an edited .blend is converted again.
pub(crate) fn cache_name(blend: &Path) -> Result<String, String> {
    let meta = fs::metadata(blend).map_err(|e| e.to_string())?;
    let modified = meta.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map_or(0, |d| d.as_secs());
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for b in blend.to_string_lossy().bytes().chain(modified.to_le_bytes()) {
        hash ^= u64::from(b);
        hash = hash.wrapping_mul(0x0100_0000_01b3);
    }
    Ok(format!("{hash:016x}.glb"))
}

fn convert_blend(blend: PathBuf, exe: PathBuf, cache_dir: PathBuf) -> Result<String, String> {
    if extension(&blend) != "blend" || !blend.is_file() {
        return Err("not a .blend file".into());
    }
    let stem = exe.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
    if stem != "blender" || !exe.is_file() {
        return Err("program is not Blender".into());
    }
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    let out = cache_dir.join(cache_name(&blend)?);
    if out.is_file() {
        return Ok(out.to_string_lossy().into_owned());
    }
    let mut child = Command::new(&exe).args(blend_args(&blend, &out)).spawn().map_err(|e| e.to_string())?;
    let started = Instant::now();
    loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            if status.success() && out.is_file() {
                return Ok(out.to_string_lossy().into_owned());
            }
            return Err("Blender could not export this file".into());
        }
        if started.elapsed() > BLEND_TIMEOUT {
            let _ = child.kill();
            return Err("Blender took too long".into());
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

/// Converts a .blend into a .glb in the app cache with the user's own Blender (no shell).
#[tauri::command]
pub async fn blend_to_glb(app: tauri::AppHandle, blend: String, exe: String) -> Result<String, String> {
    let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("models");
    tauri::async_runtime::spawn_blocking(move || convert_blend(PathBuf::from(blend), PathBuf::from(exe), cache_dir))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("gamedev-dashboard-models-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn model_files_must_stay_in_the_model_folder() {
        let dir = temp_dir("paths");
        fs::create_dir_all(dir.join("model/textures")).unwrap();
        fs::write(dir.join("model/ship.gltf"), b"{}").unwrap();
        fs::write(dir.join("model/textures/hull.png"), b"x").unwrap();
        fs::write(dir.join("secret.png"), b"x").unwrap();
        fs::write(dir.join("model/notes.txt"), b"x").unwrap();
        let base = dir.join("model/ship.gltf");
        assert!(check_model_path(&base, None).is_ok());
        assert!(check_model_path(&dir.join("model/textures/hull.png"), Some(&base)).is_ok());
        assert!(check_model_path(&dir.join("model/../secret.png"), Some(&base)).is_err());
        assert!(check_model_path(&dir.join("model/notes.txt"), None).is_err());
        assert!(check_model_path(&dir.join("model/missing.glb"), None).is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn reads_the_flattened_image_from_a_kra_file() {
        let dir = temp_dir("kra");
        let path = dir.join("art.kra");
        let mut zip = zip::ZipWriter::new(fs::File::create(&path).unwrap());
        let options = zip::write::SimpleFileOptions::default();
        zip.start_file("mimetype", options).unwrap();
        zip.write_all(b"application/x-krita").unwrap();
        zip.start_file("mergedimage.png", options).unwrap();
        zip.write_all(b"\x89PNGfake").unwrap();
        zip.finish().unwrap();
        assert_eq!(kra_preview(&path).unwrap(), b"\x89PNGfake");
        fs::write(dir.join("broken.kra"), b"not a zip").unwrap();
        assert!(kra_preview(&dir.join("broken.kra")).is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn blender_gets_a_fixed_argument_list() {
        let args = blend_args(Path::new("C:/art/ship.blend"), Path::new("C:/cache/x.glb"));
        let args: Vec<String> = args.iter().map(|a| a.to_string_lossy().into_owned()).collect();
        assert_eq!(args[0], "-b");
        assert_eq!(args[1], "C:/art/ship.blend");
        assert_eq!(args[2], "--python-expr");
        assert!(args[3].contains("export_scene.gltf"));
        assert_eq!(args[4], "--");
        assert_eq!(args[5], "C:/cache/x.glb");
    }

    #[test]
    fn only_blender_converts_blend_files() {
        let dir = temp_dir("blend");
        let blend = dir.join("ship.blend");
        fs::write(&blend, b"BLENDER").unwrap();
        let fake = dir.join("notepad.exe");
        fs::write(&fake, b"x").unwrap();
        assert!(convert_blend(blend.clone(), fake, dir.join("cache")).is_err());
        assert!(convert_blend(dir.join("ship.txt"), dir.join("blender.exe"), dir.join("cache")).is_err());
        assert!(cache_name(&blend).unwrap().ends_with(".glb"));
        let _ = fs::remove_dir_all(dir);
    }
}
