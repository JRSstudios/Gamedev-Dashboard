//! Daily copies of data.json (the last 14 are kept), optionally mirrored into a folder the user
//! chose (for example a cloud drive). Only files named `data-YYYY-MM-DD.json` are ever touched.

use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::Manager;

const KEEP: usize = 14;
const MIRROR_PREFIX: &str = "gamedev-dashboard-";

/// `YYYY-MM-DD` with plausible numbers; nothing else can end up in a file name.
pub(crate) fn valid_date(date: &str) -> bool {
    let b = date.as_bytes();
    b.len() == 10
        && b[4] == b'-'
        && b[7] == b'-'
        && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
        && (1..=12).contains(&date[5..7].parse::<u8>().unwrap_or(0))
        && (1..=31).contains(&date[8..10].parse::<u8>().unwrap_or(0))
}

fn snapshot_name(prefix: &str, date: &str) -> String {
    format!("{prefix}{date}.json")
}

/// Date part of a snapshot file name, if the name matches exactly.
fn date_of(name: &str, prefix: &str) -> Option<String> {
    let date = name.strip_prefix(prefix)?.strip_suffix(".json")?;
    valid_date(date).then(|| date.to_string())
}

/// Deletes the oldest snapshots beyond `KEEP` in one folder.
pub(crate) fn prune(dir: &Path, prefix: &str) -> Result<(), String> {
    let mut dates: Vec<String> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter_map(|e| date_of(&e.file_name().to_string_lossy(), prefix))
        .collect();
    dates.sort();
    let extra = dates.len().saturating_sub(KEEP);
    for date in &dates[..extra] {
        let _ = fs::remove_file(dir.join(snapshot_name(prefix, date)));
    }
    Ok(())
}

fn dirs(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let snaps = base.join("snapshots");
    fs::create_dir_all(&snaps).map_err(|e| e.to_string())?;
    Ok((base.join("data.json"), snaps))
}

/// Copies data.json to today's snapshot (once per day) and into the backup folder, then prunes.
pub(crate) fn snapshot(data: &Path, snaps: &Path, date: &str, mirror: Option<&Path>) -> Result<bool, String> {
    if !valid_date(date) {
        return Err("invalid date".into());
    }
    if !data.is_file() {
        return Ok(false);
    }
    let target = snaps.join(snapshot_name("data-", date));
    let created = !target.exists();
    if created {
        fs::copy(data, &target).map_err(|e| e.to_string())?;
        prune(snaps, "data-")?;
    }
    if let Some(dir) = mirror {
        if !dir.is_dir() {
            return Err("backup folder not found".into());
        }
        fs::copy(data, dir.join(snapshot_name(MIRROR_PREFIX, date))).map_err(|e| e.to_string())?;
        prune(dir, MIRROR_PREFIX)?;
    }
    Ok(created)
}

#[tauri::command]
pub fn snapshot_now(app: tauri::AppHandle, date: String, backup_dir: Option<String>) -> Result<bool, String> {
    let (data, snaps) = dirs(&app)?;
    snapshot(&data, &snaps, &date, backup_dir.as_deref().filter(|d| !d.is_empty()).map(Path::new))
}

#[derive(Serialize)]
pub struct SnapshotInfo {
    date: String,
    size: u64,
}

#[tauri::command]
pub fn list_snapshots(app: tauri::AppHandle) -> Result<Vec<SnapshotInfo>, String> {
    let (_, snaps) = dirs(&app)?;
    let mut list: Vec<SnapshotInfo> = fs::read_dir(&snaps)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let date = date_of(&e.file_name().to_string_lossy(), "data-")?;
            Some(SnapshotInfo { date, size: e.metadata().ok()?.len() })
        })
        .collect();
    list.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(list)
}

#[tauri::command]
pub fn read_snapshot(app: tauri::AppHandle, date: String) -> Result<String, String> {
    if !valid_date(&date) {
        return Err("invalid date".into());
    }
    let (_, snaps) = dirs(&app)?;
    fs::read_to_string(snaps.join(snapshot_name("data-", &date))).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates_are_strict() {
        assert!(valid_date("2026-11-03"));
        for bad in ["2026-13-01", "2026-1-01", "../../x", "2026-11-03.json", "abcd-ef-gh", ""] {
            assert!(!valid_date(bad), "{bad}");
        }
    }

    #[test]
    fn keeps_one_per_day_and_only_the_last_fourteen() {
        let root = std::env::temp_dir().join(format!("gd-snap-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let snaps = root.join("snapshots");
        let mirror = root.join("cloud");
        fs::create_dir_all(&snaps).unwrap();
        fs::create_dir_all(&mirror).unwrap();
        fs::write(mirror.join("notes.txt"), "keep me").unwrap();
        let data = root.join("data.json");
        fs::write(&data, "{\"v\":1}").unwrap();
        for day in 1..=20 {
            let date = format!("2026-10-{day:02}");
            assert!(snapshot(&data, &snaps, &date, Some(&mirror)).unwrap());
        }
        fs::write(&data, "{\"v\":2}").unwrap();
        assert!(!snapshot(&data, &snaps, "2026-10-20", None).unwrap());
        assert_eq!(fs::read_to_string(snaps.join("data-2026-10-20.json")).unwrap(), "{\"v\":1}");
        assert_eq!(fs::read_dir(&snaps).unwrap().count(), KEEP);
        assert!(!snaps.join("data-2026-10-06.json").exists());
        assert!(snaps.join("data-2026-10-07.json").exists());
        assert_eq!(fs::read_dir(&mirror).unwrap().count(), KEEP + 1);
        assert!(mirror.join("notes.txt").exists());
        let _ = fs::remove_dir_all(&root);
    }
}
