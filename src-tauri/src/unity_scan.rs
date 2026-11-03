//! Read-only look at a linked Unity project for the smart suggestions: installed packages, files
//! under Assets (by type and folder), and TODO/FIXME comments in C# scripts. Nothing is written.

use serde::Serialize;
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};

use crate::transfer::is_unity_project;

const MAX_FILES: usize = 5000;
const MAX_DEPTH: usize = 10;
const MAX_SCRIPT_BYTES: u64 = 256 * 1024;
const MAX_TODOS: usize = 200;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UnityScan {
    /// Package ids from Packages/manifest.json.
    packages: Vec<String>,
    /// Paths relative to the project, forward slashes, e.g. "Assets/Scripts/Player.cs".
    files: Vec<String>,
    todos: Vec<Todo>,
    /// True when the file limit was reached.
    truncated: bool,
}

#[derive(Serialize)]
pub struct Todo {
    file: String,
    line: usize,
    text: String,
}

fn walk(dir: &Path, depth: usize, out: &mut Vec<PathBuf>) {
    let Ok(read) = fs::read_dir(dir) else { return };
    for item in read.flatten() {
        if out.len() >= MAX_FILES {
            return;
        }
        let path = item.path();
        let name = item.file_name().to_string_lossy().to_string();
        // Unity's hidden folders (Name~) and dot folders are not part of the project.
        if name.starts_with('.') || name.ends_with('~') {
            continue;
        }
        let Ok(kind) = item.file_type() else { continue };
        if kind.is_symlink() {
            continue;
        }
        if kind.is_dir() {
            if depth < MAX_DEPTH {
                walk(&path, depth + 1, out);
            }
        } else if kind.is_file() && !name.ends_with(".meta") {
            out.push(path);
        }
    }
}

/// `// TODO: …` / `// FIXME …` lines of one script, trimmed.
pub(crate) fn todos_in(text: &str) -> Vec<(usize, String)> {
    text.lines()
        .enumerate()
        .filter_map(|(i, line)| {
            let comment = line.split_once("//")?.1.trim();
            let upper = comment.to_uppercase();
            let tag = ["TODO", "FIXME", "HACK"].into_iter().find(|t| upper.starts_with(t))?;
            let rest = comment[tag.len()..].trim_start_matches([':', ' ', '-', '(']).trim();
            (!rest.is_empty()).then(|| (i + 1, rest.chars().take(200).collect()))
        })
        .collect()
}

/// Package ids of a manifest.json ("dependencies" keys).
pub(crate) fn packages_in(manifest: &str) -> Vec<String> {
    serde_json::from_str::<serde_json::Value>(manifest)
        .ok()
        .and_then(|v| v.get("dependencies")?.as_object().map(|d| d.keys().take(300).cloned().collect()))
        .unwrap_or_default()
}

#[tauri::command]
pub async fn scan_unity_project(dir: String) -> Result<UnityScan, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = PathBuf::from(&dir);
        if !is_unity_project(&root) {
            return Err("not a Unity project".to_string());
        }
        let mut scan = UnityScan::default();
        if let Ok(text) = fs::read_to_string(root.join("Packages").join("manifest.json")) {
            scan.packages = packages_in(&text);
        }
        let mut paths = Vec::new();
        walk(&root.join("Assets"), 0, &mut paths);
        scan.truncated = paths.len() >= MAX_FILES;
        for path in paths {
            let rel = path.strip_prefix(&root).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            if scan.todos.len() < MAX_TODOS && rel.to_lowercase().ends_with(".cs") {
                if let Ok(file) = fs::File::open(&path) {
                    let mut text = String::new();
                    if file.take(MAX_SCRIPT_BYTES).read_to_string(&mut text).is_ok() {
                        for (line, t) in todos_in(&text) {
                            if scan.todos.len() < MAX_TODOS {
                                scan.todos.push(Todo { file: rel.clone(), line, text: t });
                            }
                        }
                    }
                }
            }
            scan.files.push(rel);
        }
        Ok(scan)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_todo_comments() {
        let code = "void A() {\n  // TODO: add coyote time\n  x++; // fixme - clamp speed\n  // just a note\n  // TODO\n}";
        assert_eq!(todos_in(code), vec![(2, "add coyote time".to_string()), (3, "clamp speed".to_string())]);
    }

    #[test]
    fn reads_package_ids() {
        let m = r#"{"dependencies":{"com.unity.inputsystem":"1.19.0","com.unity.cinemachine":"3.1.4"}}"#;
        assert_eq!(packages_in(m), vec!["com.unity.cinemachine", "com.unity.inputsystem"]);
        assert!(packages_in("not json").is_empty());
    }

    #[test]
    fn scans_a_project_without_meta_files() {
        let dir = std::env::temp_dir().join(format!("gd-scan-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("Assets/Scripts")).unwrap();
        fs::create_dir_all(dir.join("ProjectSettings")).unwrap();
        fs::create_dir_all(dir.join("Packages")).unwrap();
        fs::write(dir.join("Packages/manifest.json"), r#"{"dependencies":{"com.unity.2d.sprite":"1.0.0"}}"#).unwrap();
        fs::write(dir.join("Assets/Scripts/Player.cs"), "// TODO jump").unwrap();
        fs::write(dir.join("Assets/Scripts/Player.cs.meta"), "guid").unwrap();
        let scan = tauri::async_runtime::block_on(scan_unity_project(dir.to_string_lossy().into_owned())).unwrap();
        assert_eq!(scan.files, vec!["Assets/Scripts/Player.cs"]);
        assert_eq!(scan.todos.len(), 1);
        assert_eq!(scan.packages, vec!["com.unity.2d.sprite"]);
        let _ = fs::remove_dir_all(&dir);
    }
}
