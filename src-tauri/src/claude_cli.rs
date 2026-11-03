//! Claude through the user's own installed Claude Code (`claude -p`), using their subscription.
//! Fixed argument list, no shell, all tools switched off, prompt on stdin, hard timeout. The app
//! never sees a login or token: Claude Code handles that itself.

use serde::Serialize;
use std::{
    env, fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

const TIMEOUT: Duration = Duration::from_secs(240);
const MAX_PROMPT_BYTES: usize = 400_000;
const MAX_OUTPUT_BYTES: u64 = 8 * 1024 * 1024;

/// Only the native executable is started; `.cmd`/`.bat` wrappers would need a shell.
fn exe_name() -> &'static str {
    if cfg!(windows) { "claude.exe" } else { "claude" }
}

/// PATH first, then the default folder of the native installer.
pub(crate) fn find_claude() -> Option<PathBuf> {
    let mut dirs: Vec<PathBuf> = env::var_os("PATH").map(|p| env::split_paths(&p).collect()).unwrap_or_default();
    if let Some(home) = env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }) {
        dirs.push(Path::new(&home).join(".local").join("bin"));
    }
    dirs.into_iter().map(|d| d.join(exe_name())).find(|p| p.is_file())
}

/// Model ids and aliases only: letters, digits, dots, dashes; never anything that looks like a flag.
pub(crate) fn valid_model(model: &str) -> bool {
    !model.is_empty() && model.len() <= 100 && !model.starts_with('-') && model.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.' || c == '_')
}

/// The complete argument list. Tools off, one turn, no session file, no MCP servers.
pub(crate) fn cli_args(model: &str, system_file: &Path) -> Vec<String> {
    vec![
        "-p".into(),
        "--output-format".into(),
        "json".into(),
        "--tools".into(),
        String::new(),
        "--max-turns".into(),
        "1".into(),
        "--no-session-persistence".into(),
        "--strict-mcp-config".into(),
        "--model".into(),
        model.into(),
        "--system-prompt-file".into(),
        system_file.to_string_lossy().into_owned(),
    ]
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    found: bool,
    path: Option<String>,
    version: Option<String>,
}

#[tauri::command]
pub async fn claude_cli_status() -> CliStatus {
    tauri::async_runtime::spawn_blocking(|| {
        let Some(path) = find_claude() else {
            return CliStatus { found: false, path: None, version: None };
        };
        let version = Command::new(&path)
            .arg("--version")
            .stdin(Stdio::null())
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().chars().take(80).collect());
        CliStatus { found: true, path: Some(path.to_string_lossy().into_owned()), version }
    })
    .await
    .unwrap_or(CliStatus { found: false, path: None, version: None })
}

fn run(model: String, system: String, prompt: String) -> Result<String, String> {
    if !valid_model(&model) {
        return Err("invalid model".into());
    }
    if prompt.len() + system.len() > MAX_PROMPT_BYTES {
        return Err("request too large".into());
    }
    let exe = find_claude().ok_or("Claude Code is not installed (claude.exe not found).")?;
    // An empty folder as working directory: no project CLAUDE.md or settings get pulled in.
    let work = env::temp_dir().join(format!("gamedev-dashboard-claude-{}", std::process::id()));
    fs::create_dir_all(&work).map_err(|e| e.to_string())?;
    let system_file = work.join("system.txt");
    fs::write(&system_file, system).map_err(|e| e.to_string())?;

    let mut child = Command::new(exe)
        .args(cli_args(&model, &system_file))
        .current_dir(&work)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("could not start Claude Code: {e}"))?;
    let mut stdin = child.stdin.take().ok_or("no stdin")?;
    let writer = thread::spawn(move || {
        let _ = stdin.write_all(prompt.as_bytes());
    });
    let mut stdout = child.stdout.take().ok_or("no stdout")?;
    let reader = thread::spawn(move || {
        let mut out = String::new();
        let _ = (&mut stdout).take(MAX_OUTPUT_BYTES).read_to_string(&mut out);
        out
    });
    let mut stderr = child.stderr.take().ok_or("no stderr")?;
    let err_reader = thread::spawn(move || {
        let mut out = String::new();
        let _ = (&mut stderr).take(64 * 1024).read_to_string(&mut out);
        out
    });

    let start = Instant::now();
    let status = loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            break status;
        }
        if start.elapsed() > TIMEOUT {
            let _ = child.kill();
            let _ = child.wait();
            let _ = fs::remove_dir_all(&work);
            return Err("Claude Code took too long.".into());
        }
        thread::sleep(Duration::from_millis(100));
    };
    let _ = writer.join();
    let out = reader.join().unwrap_or_default();
    let err = err_reader.join().unwrap_or_default();
    let _ = fs::remove_dir_all(&work);
    if out.trim().is_empty() {
        let reason = if status.success() { "no output".to_string() } else { err.chars().take(400).collect() };
        return Err(format!("Claude Code failed: {reason}"));
    }
    Ok(out)
}

/// Runs one prompt through Claude Code and returns its JSON result unchanged.
#[tauri::command]
pub async fn claude_cli_request(model: String, system: String, prompt: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run(model, system, prompt))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arguments_are_fixed_and_tools_are_off() {
        let args = cli_args("claude-sonnet-5-5", Path::new("sys.txt"));
        let tools = args.iter().position(|a| a == "--tools").unwrap();
        assert_eq!(args[tools + 1], "");
        assert!(args.contains(&"--no-session-persistence".to_string()));
        assert_eq!(args.last().unwrap(), "sys.txt");
    }

    #[test]
    fn model_cannot_inject_flags() {
        assert!(valid_model("claude-opus-5-5"));
        assert!(valid_model("sonnet"));
        for bad in ["", "--dangerously-skip-permissions", "a b", "x;y", "m\"q"] {
            assert!(!valid_model(bad), "{bad}");
        }
    }
}
