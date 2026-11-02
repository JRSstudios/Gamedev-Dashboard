# Security

## Reporting
Please report vulnerabilities privately via GitHub's "Report a vulnerability" (Security tab) instead of a public issue.

## Design
- Everything stays on your machine. No telemetry, no remote content, strict Content-Security-Policy.
- Tauri capabilities are minimal (dialogs, window state). File access goes through a few Rust commands: atomic save of `data.json`, existence checks, size/type-limited previews of image/audio files, and export/import limited to `.json`/`.md` paths chosen in native dialogs.
- Stored and imported JSON is validated with a schema and size limits before use; invalid data is never overwritten silently.
- Linked asset paths are only read for previews, never executed.
- AI: only talks to the `http(s)` server you configure (normally `localhost`). Model output is validated, treated as untrusted suggestions and applied only after confirmation. Asset names and notes sent to the model are data, not instructions.
- Release installers are currently unsigned.
