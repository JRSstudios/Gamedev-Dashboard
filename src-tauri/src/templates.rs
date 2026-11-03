//! Community templates: the catalog is read from one fixed GitHub folder only, and template
//! C# scripts are written into the linked Unity project after the user has read them.

use std::{fs, io::Read, path::Path, time::Duration};

use crate::transfer::is_unity_project;

/// The only place templates are downloaded from.
const CATALOG_BASE: &str = "https://raw.githubusercontent.com/JRSstudios/Gamedev-Dashboard/main/templates/";
const MAX_TEMPLATE_BYTES: u64 = 1024 * 1024;
const MAX_SCRIPT_BYTES: usize = 100_000;
const SCRIPT_FOLDER: &str = "Assets/Scripts/Templates";

/// `index.json` or `<slug>.gdtemplate.json`; nothing else can be requested.
pub(crate) fn catalog_url(name: &str) -> Result<String, String> {
    let ok = name == "index.json"
        || name
            .strip_suffix(".gdtemplate.json")
            .is_some_and(|slug| !slug.is_empty() && slug.len() <= 61 && slug.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') && !slug.starts_with('-'));
    if !ok {
        return Err("invalid template name".into());
    }
    Ok(format!("{CATALOG_BASE}{name}"))
}

#[tauri::command]
pub async fn templates_fetch(name: String) -> Result<String, String> {
    let url = catalog_url(&name)?;
    tauri::async_runtime::spawn_blocking(move || {
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(20)).redirects(0).build();
        let resp = agent.get(&url).call().map_err(|e| format!("catalog not reachable: {e}"))?;
        let mut text = String::new();
        resp.into_reader()
            .take(MAX_TEMPLATE_BYTES + 1)
            .read_to_string(&mut text)
            .map_err(|e| e.to_string())?;
        if text.len() as u64 > MAX_TEMPLATE_BYTES {
            return Err("template too large".into());
        }
        serde_json::from_str::<serde_json::Value>(&text).map_err(|_| "not a template".to_string())?;
        Ok(text)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Script names are C# identifiers ending in `.cs`, so they cannot leave the script folder.
pub(crate) fn valid_script_name(file: &str) -> bool {
    file.strip_suffix(".cs").is_some_and(|stem| {
        !stem.is_empty() && stem.len() <= 61 && stem.chars().next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_') && stem.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
    })
}

/// Writes one script to `Assets/Scripts/Templates` of the linked Unity project. An existing file
/// is never overwritten (a renamed copy would not compile either: two classes with one name).
#[tauri::command]
pub fn write_unity_script(unity_dir: String, file: String, text: String) -> Result<String, String> {
    let root = Path::new(&unity_dir);
    if !is_unity_project(root) {
        return Err("not a Unity project".into());
    }
    if !valid_script_name(&file) || text.len() > MAX_SCRIPT_BYTES {
        return Err("invalid script".into());
    }
    let dir = root.join(SCRIPT_FOLDER);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let target = dir.join(&file);
    if target.exists() {
        return Err("exists".into());
    }
    fs::write(&target, text).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_catalog_files_can_be_fetched() {
        assert!(catalog_url("index.json").unwrap().starts_with(CATALOG_BASE));
        assert!(catalog_url("2d-platformer.gdtemplate.json").is_ok());
        for bad in ["../secret.json", "a/b.gdtemplate.json", "x.json", ".gdtemplate.json", "-x.gdtemplate.json", "UPPER.gdtemplate.json", "https://evil/x.gdtemplate.json"] {
            assert!(catalog_url(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn scripts_go_into_the_unity_project_without_overwriting() {
        assert!(valid_script_name("PlayerMove.cs"));
        for bad in ["../x.cs", "a/b.cs", "x.txt", ".cs", "1x.cs", "x y.cs"] {
            assert!(!valid_script_name(bad), "{bad}");
        }
        let dir = std::env::temp_dir().join(format!("gd-tpl-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("Assets")).unwrap();
        fs::create_dir_all(dir.join("ProjectSettings")).unwrap();
        let unity = dir.to_string_lossy().into_owned();
        let a = write_unity_script(unity.clone(), "Mover.cs".into(), "class Mover {}".into()).unwrap();
        assert!(a.ends_with("Mover.cs"));
        assert_eq!(write_unity_script(unity.clone(), "Mover.cs".into(), "class Other {}".into()), Err("exists".into()));
        assert_eq!(fs::read_to_string(&a).unwrap(), "class Mover {}");
        assert!(write_unity_script(unity, "../Evil.cs".into(), String::new()).is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
