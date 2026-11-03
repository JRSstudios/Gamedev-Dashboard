//! File transfer between this app, Unity and Blender. Everything here is folder based:
//! files are copied (never moved, never overwritten) into folders the user linked.

use serde::Serialize;
use std::{
    fs,
    path::{Component, Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};

const MAX_LIST_ENTRIES: usize = 500;
const MAX_LIST_DEPTH: usize = 6;

/// A Unity project has both `Assets` and `ProjectSettings` next to each other.
pub(crate) fn is_unity_project(dir: &Path) -> bool {
    dir.join("Assets").is_dir() && dir.join("ProjectSettings").is_dir()
}

/// A relative sub folder made only of normal components: no `..`, no drive letters, no absolute paths.
pub(crate) fn safe_sub(sub: &str) -> Result<PathBuf, String> {
    let mut out = PathBuf::new();
    for part in sub.split(['/', '\\']).filter(|p| !p.is_empty()) {
        if part.contains(':') || part.chars().any(|c| c.is_control()) {
            return Err("invalid folder".into());
        }
        let mut comps = Path::new(part).components();
        match (comps.next(), comps.next()) {
            (Some(Component::Normal(name)), None) => out.push(name),
            _ => return Err("invalid folder".into()),
        }
    }
    Ok(out)
}

/// File names only: no separators, no reserved characters, never empty.
pub(crate) fn sanitize_name(name: &str) -> Result<String, String> {
    let cleaned: String = name
        .chars()
        .filter(|c| !c.is_control() && !"<>:\"/\\|?*".contains(*c))
        .collect();
    let cleaned = cleaned.trim().trim_matches('.').to_string();
    if cleaned.is_empty() {
        return Err("invalid file name".into());
    }
    Ok(cleaned)
}

/// `name.ext` -> `name-1.ext`, `name-2.ext`, ... so nothing is ever overwritten.
pub(crate) fn unique_path(dir: &Path, name: &str) -> Result<PathBuf, String> {
    let first = dir.join(name);
    if !first.exists() {
        return Ok(first);
    }
    let path = Path::new(name);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(name);
    let ext = path.extension().and_then(|s| s.to_str());
    for n in 1..1000 {
        let candidate = match ext {
            Some(ext) => format!("{stem}-{n}.{ext}"),
            None => format!("{stem}-{n}"),
        };
        let p = dir.join(candidate);
        if !p.exists() {
            return Ok(p);
        }
    }
    Err("too many files with the same name".into())
}

#[tauri::command]
pub fn inspect_unity_project(dir: String) -> bool {
    is_unity_project(Path::new(&dir))
}

/// Copies `src` into `dest_dir/sub`. `kind` is "unity" (dest must be a Unity project) or "blender".
/// Returns the path of the new copy. With `replace` (auto export of the same file again), an
/// existing file of the same name is updated instead of getting a `-1` copy.
#[tauri::command]
pub fn copy_into_folder(src: String, dest_dir: String, sub: String, kind: String, replace: Option<bool>) -> Result<String, String> {
    let src = Path::new(&src);
    if !src.is_file() {
        return Err("source is not a file".into());
    }
    let root = Path::new(&dest_dir);
    if !root.is_dir() {
        return Err("target folder does not exist".into());
    }
    match kind.as_str() {
        "unity" if !is_unity_project(root) => return Err("not a Unity project folder".into()),
        "unity" | "blender" => {}
        _ => return Err("unknown target".into()),
    }
    let target_dir = root.join(safe_sub(&sub)?);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    // A symlinked sub folder must not lead out of the linked project.
    let canon_root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    let canon_target = fs::canonicalize(&target_dir).map_err(|e| e.to_string())?;
    if !canon_target.starts_with(&canon_root) {
        return Err("target leaves the project folder".into());
    }
    let name = sanitize_name(src.file_name().and_then(|n| n.to_str()).unwrap_or(""))?;
    let dest = if replace.unwrap_or(false) && target_dir.join(&name).is_file() { target_dir.join(&name) } else { unique_path(&target_dir, &name)? };
    fs::copy(src, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}

#[derive(Serialize)]
pub struct FileEntry {
    path: String,
    name: String,
    size: u64,
    /// Seconds since the Unix epoch.
    modified: u64,
}

fn walk(dir: &Path, depth: usize, max_depth: usize, exts: &[String], out: &mut Vec<FileEntry>) {
    let Ok(read) = fs::read_dir(dir) else { return };
    for item in read.flatten() {
        if out.len() >= MAX_LIST_ENTRIES * 4 {
            return;
        }
        let path = item.path();
        let Ok(meta) = item.metadata() else { continue };
        if meta.is_dir() {
            if depth < max_depth {
                walk(&path, depth + 1, max_depth, exts, out);
            }
        } else if meta.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if exts.is_empty() || exts.contains(&ext) {
                let modified = meta
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map_or(0, |d| d.as_secs());
                out.push(FileEntry {
                    path: path.to_string_lossy().into_owned(),
                    name: item.file_name().to_string_lossy().into_owned(),
                    size: meta.len(),
                    modified,
                });
            }
        }
    }
}

/// Newest files first, at most `limit` (capped at 500), `depth` folders deep (default 2, max 6).
/// Used for the Blender/Krita inboxes and for importing an existing Unity project.
#[tauri::command]
pub fn list_folder(dir: String, exts: Vec<String>, limit: usize, depth: Option<usize>) -> Result<Vec<FileEntry>, String> {
    let root = Path::new(&dir);
    if !root.is_dir() {
        return Err("folder does not exist".into());
    }
    let exts: Vec<String> = exts.iter().map(|e| e.trim_start_matches('.').to_lowercase()).collect();
    let mut out = Vec::new();
    walk(root, 0, depth.unwrap_or(2).min(MAX_LIST_DEPTH), &exts, &mut out);
    out.sort_by_key(|f| std::cmp::Reverse(f.modified));
    out.truncate(limit.clamp(1, MAX_LIST_ENTRIES));
    Ok(out)
}

/// Starts Unity or Blender. `exe` must be the editor itself (file stem `Unity` / `blender`).
/// There is no shell involved and no free-form arguments.
#[tauri::command]
pub fn open_in_app(kind: String, exe: String, target: Option<String>) -> Result<(), String> {
    let exe = Path::new(&exe);
    if !exe.is_file() {
        return Err("program not found".into());
    }
    let stem = exe
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mut cmd = Command::new(exe);
    match (kind.as_str(), stem.as_str()) {
        ("unity", "unity") => {
            let project = target.ok_or("missing Unity project")?;
            if !is_unity_project(Path::new(&project)) {
                return Err("not a Unity project folder".into());
            }
            cmd.arg("-projectPath").arg(project);
        }
        ("blender", "blender") => {
            if let Some(file) = target {
                let p = Path::new(&file);
                let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                if !p.is_file() || ext != "blend" {
                    return Err("not a .blend file".into());
                }
                cmd.arg(p);
            }
        }
        ("krita", "krita") => {
            if let Some(file) = target {
                let p = Path::new(&file);
                let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                if !p.is_file() || !["kra", "png", "jpg", "jpeg", "psd", "ora"].contains(&ext.as_str()) {
                    return Err("not an image Krita can open".into());
                }
                cmd.arg(p);
            }
        }
        _ => return Err("program does not match".into()),
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("gamedev-dashboard-test-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn sub_folders_cannot_escape() {
        assert_eq!(safe_sub("Assets/Art/Concept").unwrap(), PathBuf::from("Assets").join("Art").join("Concept"));
        assert_eq!(safe_sub("").unwrap(), PathBuf::new());
        assert!(safe_sub("../outside").is_err());
        assert!(safe_sub("Assets/../../x").is_err());
        assert!(safe_sub("C:/Windows").is_err());
        assert!(safe_sub("a:b").is_err());
    }

    #[test]
    fn file_names_are_cleaned() {
        assert_eq!(sanitize_name("hero:final?.png").unwrap(), "herofinal.png");
        assert_eq!(sanitize_name("..\\evil.txt").unwrap(), "evil.txt");
        assert!(sanitize_name("...").is_err());
        assert!(sanitize_name("").is_err());
    }

    #[test]
    fn copies_never_overwrite() {
        let unity = temp_dir("unity");
        fs::create_dir_all(unity.join("Assets")).unwrap();
        fs::create_dir_all(unity.join("ProjectSettings")).unwrap();
        let src_dir = temp_dir("src");
        let src = src_dir.join("hero.png");
        fs::write(&src, b"one").unwrap();

        let a = copy_into_folder(src.to_string_lossy().into(), unity.to_string_lossy().into(), "Assets/Art".into(), "unity".into(), None).unwrap();
        let b = copy_into_folder(src.to_string_lossy().into(), unity.to_string_lossy().into(), "Assets/Art".into(), "unity".into(), None).unwrap();
        assert!(a.ends_with("hero.png"));
        assert!(b.ends_with("hero-1.png"));
        assert_eq!(fs::read(&a).unwrap(), b"one");

        let c = copy_into_folder(src.to_string_lossy().into(), unity.to_string_lossy().into(), "Assets/Art".into(), "unity".into(), Some(true)).unwrap();
        assert_eq!(c, a, "replace updates the existing copy");
        assert!(copy_into_folder(src.to_string_lossy().into(), unity.to_string_lossy().into(), "../x".into(), "unity".into(), None).is_err());
        assert!(copy_into_folder(src.to_string_lossy().into(), src_dir.to_string_lossy().into(), "".into(), "unity".into(), None).is_err());
        assert!(copy_into_folder(src.to_string_lossy().into(), unity.to_string_lossy().into(), "".into(), "other".into(), None).is_err());
        let _ = fs::remove_dir_all(unity);
        let _ = fs::remove_dir_all(src_dir);
    }

    #[test]
    fn lists_newest_first_and_filters_extensions() {
        let dir = temp_dir("list");
        fs::write(dir.join("a.fbx"), b"1").unwrap();
        fs::write(dir.join("b.txt"), b"2").unwrap();
        fs::create_dir_all(dir.join("sub")).unwrap();
        fs::write(dir.join("sub").join("c.FBX"), b"3").unwrap();
        let found = list_folder(dir.to_string_lossy().into(), vec![".fbx".into()], 10, None).unwrap();
        let mut names: Vec<_> = found.iter().map(|f| f.name.clone()).collect();
        names.sort();
        assert_eq!(names, vec!["a.fbx", "c.FBX"]);
        assert!(list_folder("Z:/does/not/exist".into(), vec![], 10, None).is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn only_matching_programs_start() {
        assert!(open_in_app("blender".into(), "Z:/missing/blender.exe".into(), None).is_err());
        let dir = temp_dir("exe");
        let fake = dir.join("notepad.exe");
        fs::write(&fake, b"x").unwrap();
        assert!(open_in_app("blender".into(), fake.to_string_lossy().into(), None).is_err());
        assert!(open_in_app("unity".into(), fake.to_string_lossy().into(), Some(dir.to_string_lossy().into())).is_err());
        let _ = fs::remove_dir_all(dir);
    }
}
