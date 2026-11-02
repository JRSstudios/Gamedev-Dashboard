# 🎮 Gamedev Dashboard

A calm, local-first overview for your game projects. Keep **goals with progress bars**, **assets** (concept art, music, sound effects) and **quick notes** together, per project — without OneNote chaos, Notion setup work or an Obsidian maze.

- **Projects** as the top level; everything else belongs to one
- **Goals & steps** with progress bars per goal, project and overall; drag to reorder
- **Asset board**: drop files from your file manager, drag cards between columns (Concept art, Music, Sound FX, Reference, Other), image thumbnails, audio preview, tags, search, "file moved" warnings
- **Notes** with `#tags`, goal links, search and tag filter
- **Timer**: stopwatch or Pomodoro per goal; a running timer survives closing the app; "today" and "week" totals in the header
- **Calendar**: month view with heat-map by learned minutes, deadline markers, click a day to see sessions, completed steps and notes
- **Weekly Markdown export** for devlogs, plus a full project export
- **Shortcuts**: `Ctrl+N` new note, `Ctrl+T` start/stop timer (`Cmd` on macOS)
- **Departments** per project: Overview, Goals, Concept art, Inspiration (images and links), Research, Audio, Notes, Planner. White design with a dark mode toggle, a real menu bar and a `Ctrl+K` command palette
- **Unity & Blender (desktop)**: link your Unity project and Blender folders, drag an asset card onto the Unity/Blender target to copy the file (never overwritten), or drop files from the file manager onto the target tiles. A Blender export folder shows up as an inbox
- **Claude (desktop, optional)**: add your API key (kept in the OS credential store) and use quick commands in the palette, e.g. `/research movement system for a 2D platformer`, `/suggest`, `/unity coyote time`. Results go to the Research panel or are applied as goals and notes after you confirm. Optional web search with sources
- **Optional local AI** (Ollama / LM Studio): suggests categories, tags and goal steps. Always suggestions, you confirm. The app is fully usable without it. Prefer Claude Code? See [docs/ai.md](docs/ai.md)
- **German and English**, light and dark theme
- **Private by design**: no account, no cloud, no telemetry. Nothing leaves your computer unless you trigger a Claude command yourself

> Desktop app: assets are *linked*, not copied — your files stay where they are.
> Web demo: files are kept inside your browser (max 20 MB each).

## Install

Download the installer for your system from the [Releases](../../releases) page, or try the web demo (GitHub Pages, enable it in the repo settings → Pages → GitHub Actions).

Installers are **not code-signed** yet:
- **Windows**: SmartScreen shows "Windows protected your PC" → *More info* → *Run anyway*.
- **macOS**: right-click the app → *Open* the first time (Gatekeeper).

## Your data

Desktop: `data.json` in the app data folder (Windows: `%APPDATA%\io.github.jrsstudios.gamedev-dashboard`), written atomically with a `data.backup.json` kept on every start. Browser: IndexedDB. Use **Menu → Export data** for your own backups; import validates the file before replacing anything.

## Develop

Requirements: Node 22+, and for the desktop app [Rust](https://rustup.rs) plus the [Tauri prerequisites](https://tauri.app/start/prerequisites/) (on Windows: MSVC Build Tools + WebView2).

```bash
npm install
npm run dev          # web version at http://localhost:1420
npm run tauri dev    # desktop app
npm test && npm run lint && npm run typecheck
npm run tauri build  # installers
```

Releases: push a tag like `v0.1.0`; the *Release* workflow builds installers for Windows, macOS and Linux into a draft release.

## Security notes

See [SECURITY.md](SECURITY.md). Short version: strict CSP, minimal Tauri permissions, all stored/imported data is schema-validated, file paths are only read (never executed), AI traffic goes only to the local server you configure.

## Roadmap

Screenshots/demo GIF, code-signed installers, AI weekly review. See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
