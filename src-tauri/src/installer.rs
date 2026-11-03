//! Installs the bundled Unity package, Blender add-on and Krita plugin into the places the
//! programs load them from. Only our own, fixed folder names are ever created or removed.

use crate::transfer::is_unity_project;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::Manager;

const UNITY_PACKAGE: &str = "com.gamedev-dashboard.bridge";
const ADDON: &str = "gamedev_dashboard";
const MAX_FILES: usize = 200;

fn bundled(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = app.path().resource_dir().map_err(|e| e.to_string())?.join("plugins").join(name);
    if dir.is_dir() {
        Ok(dir)
    } else {
        Err(format!("bundled plugin missing: {name}"))
    }
}

/// Copies a folder tree (no symlinks, limited size) and replaces an older copy of it.
pub(crate) fn copy_tree(src: &Path, dest: &Path) -> Result<usize, String> {
    fn walk(src: &Path, dest: &Path, count: &mut usize) -> Result<(), String> {
        fs::create_dir_all(dest).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(src).map_err(|e| e.to_string())?.flatten() {
            let kind = entry.file_type().map_err(|e| e.to_string())?;
            let target = dest.join(entry.file_name());
            if kind.is_symlink() {
                continue;
            }
            if kind.is_dir() {
                if entry.file_name() == "__pycache__" {
                    continue;
                }
                walk(&entry.path(), &target, count)?;
            } else {
                *count += 1;
                if *count > MAX_FILES {
                    return Err("plugin has too many files".into());
                }
                fs::copy(entry.path(), &target).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
    if dest.exists() {
        fs::remove_dir_all(dest).map_err(|e| e.to_string())?;
    }
    let mut count = 0;
    walk(src, dest, &mut count)?;
    Ok(count)
}

fn home() -> Option<PathBuf> {
    std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from)
}

/// Blender keeps one config folder per version; add-ons go into `<version>/scripts/addons`.
fn blender_root() -> Option<PathBuf> {
    if cfg!(windows) {
        std::env::var_os("APPDATA").map(|a| PathBuf::from(a).join("Blender Foundation").join("Blender"))
    } else if cfg!(target_os = "macos") {
        home().map(|h| h.join("Library/Application Support/Blender"))
    } else {
        home().map(|h| h.join(".config/blender"))
    }
}

fn blender_versions() -> Vec<(String, PathBuf)> {
    let Some(root) = blender_root() else { return vec![] };
    let mut out: Vec<(String, PathBuf)> = fs::read_dir(root)
        .map(|rd| {
            rd.flatten()
                .filter(|e| e.path().is_dir())
                .filter_map(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    name.chars().next().filter(char::is_ascii_digit).map(|_| (name, e.path()))
                })
                .collect()
        })
        .unwrap_or_default();
    out.sort();
    out
}

fn krita_dir() -> Option<PathBuf> {
    if cfg!(windows) {
        std::env::var_os("APPDATA").map(|a| PathBuf::from(a).join("krita").join("pykrita"))
    } else if cfg!(target_os = "macos") {
        home().map(|h| h.join("Library/Application Support/krita/pykrita"))
    } else {
        home().map(|h| h.join(".local/share/krita/pykrita"))
    }
}

/// Embedded package: Unity picks up any package folder inside `Packages/` without a manifest change.
#[tauri::command]
pub fn install_unity_plugin(app: tauri::AppHandle, unity_dir: String) -> Result<String, String> {
    let root = Path::new(&unity_dir);
    if !is_unity_project(root) {
        return Err("not a Unity project".into());
    }
    let dest = root.join("Packages").join(UNITY_PACKAGE);
    copy_tree(&bundled(&app, "unity")?.join(UNITY_PACKAGE), &dest)?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub fn install_blender_addon(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let src = bundled(&app, "blender")?.join(ADDON);
    let versions = blender_versions();
    if versions.is_empty() {
        return Err("no Blender settings folder found; start Blender once, then try again".into());
    }
    for (_, dir) in &versions {
        copy_tree(&src, &dir.join("scripts").join("addons").join(ADDON))?;
    }
    Ok(versions.into_iter().map(|(v, _)| v).collect())
}

#[tauri::command]
pub fn install_krita_plugin(app: tauri::AppHandle) -> Result<String, String> {
    let dir = krita_dir().ok_or("Krita folder not found")?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    copy_tree(&bundled(&app, "krita")?.join(ADDON), &dir.join(ADDON))?;
    fs::copy(bundled(&app, "krita")?.join(format!("{ADDON}.desktop")), dir.join(format!("{ADDON}.desktop"))).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn uninstall_plugin(kind: String, unity_dir: Option<String>) -> Result<(), String> {
    let remove = |p: PathBuf| if p.exists() { fs::remove_dir_all(&p).map_err(|e| e.to_string()) } else { Ok(()) };
    match kind.as_str() {
        "unity" => {
            let dir = unity_dir.ok_or("no Unity project")?;
            remove(Path::new(&dir).join("Packages").join(UNITY_PACKAGE))
        }
        "blender" => {
            for (_, dir) in blender_versions() {
                remove(dir.join("scripts").join("addons").join(ADDON))?;
            }
            Ok(())
        }
        "krita" => {
            let dir = krita_dir().ok_or("Krita folder not found")?;
            let _ = fs::remove_file(dir.join(format!("{ADDON}.desktop")));
            remove(dir.join(ADDON))
        }
        _ => Err("unknown plugin".into()),
    }
}

#[tauri::command]
pub fn plugin_status(unity_dir: Option<String>) -> Value {
    let unity = unity_dir.map(|d| Path::new(&d).join("Packages").join(UNITY_PACKAGE).is_dir()).unwrap_or(false);
    let blender: Vec<String> = blender_versions()
        .into_iter()
        .filter(|(_, dir)| dir.join("scripts").join("addons").join(ADDON).is_dir())
        .map(|(v, _)| v)
        .collect();
    let blender_found = !blender_versions().is_empty();
    let krita = krita_dir().map(|d| d.join(ADDON).is_dir()).unwrap_or(false);
    let krita_found = krita_dir().and_then(|d| d.parent().map(Path::is_dir)).unwrap_or(false);
    json!({ "unity": unity, "blender": blender, "blenderFound": blender_found, "krita": krita, "kritaFound": krita_found })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copy_tree_replaces_and_skips_caches() {
        let base = std::env::temp_dir().join(format!("gd-install-{}", std::process::id()));
        let src = base.join("src");
        fs::create_dir_all(src.join("__pycache__")).unwrap();
        fs::create_dir_all(src.join("sub")).unwrap();
        fs::write(src.join("a.py"), "a").unwrap();
        fs::write(src.join("sub/b.py"), "b").unwrap();
        fs::write(src.join("__pycache__/x.pyc"), "x").unwrap();
        let dest = base.join("dest");
        fs::create_dir_all(&dest).unwrap();
        fs::write(dest.join("old.txt"), "old").unwrap();
        assert_eq!(copy_tree(&src, &dest).unwrap(), 2);
        assert!(dest.join("sub/b.py").is_file());
        assert!(!dest.join("old.txt").exists());
        assert!(!dest.join("__pycache__").exists());
        fs::remove_dir_all(base).unwrap();
    }
}
