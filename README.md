# 🎮 Gamedev Dashboard

A calm, local-first overview for your game projects. Keep **goals with progress bars**, **assets** (concept art, music, sound effects) and **quick notes** together, per project — without OneNote chaos, Notion setup work or an Obsidian maze.

- **Start with your Unity project**: pick your Unity project folder and the dashboard links it and takes over your existing art, audio and models. Afterwards it offers to connect Claude
- **Unity 6.6 cheat sheet** (offline, in all 7 app languages): step-by-step entries for movement in every perspective (2D side/top-down, 3D third/first person, isometric, click-to-move), the new Input System, Cinemachine 3, physics, animation, tilemaps, UI, audio, saving, enemy AI, importing from Blender and Krita, and building. Every script compiles in Unity 6000.6 (see CONTRIBUTING). Add a goal with all steps in one click, add your own entries
- **Brainstorm**: describe an idea; the app finds matching cheat sheet entries and project items, and with Claude turns it into a plan (goals with steps, a design page, tables, canvas links) that you apply item by item
- **3D models**: preview GLB/glTF/FBX/OBJ (and .blend through your own Blender) with rotate, zoom and pan; compare a model with your concept art side by side or as an overlay
- **Krita**: .kra thumbnails, an art-folder inbox, "Open in Krita" on concept art; drop files anywhere in the window and they are sorted into the project by type
- **Hub for Unity, Blender and Krita**: the start page shows which programs are connected and an inbox with every new export. One click installs small plugins: the **Blender add-on** exports for Unity whenever you save (FBX/GLB with the right axes and scale) and checks the model (unapplied scale, missing UVs, n-gons, polygon count); the **Krita plugin** exports a PNG on save and layers as single sprites; the **Unity package** imports what the dashboard copies with sensible presets (pixel art, PPU, audio load types), shows Unity console errors in the dashboard with a link to the matching cheat sheet entry, creates prefabs and opens scenes. Turn on auto import and new exports land in the project (and in Unity) by themselves. Everything runs locally over `127.0.0.1`
- **Projects** as the top level; everything else belongs to one
- **Goals & steps** with progress bars per goal, project and overall; drag to reorder
- **Asset board**: drop files from your file manager, drag cards between columns (Concept art, Music, Sound FX, Reference, Other), image thumbnails, audio preview, tags, search, "file moved" warnings
- **Notes** with `#tags`, goal links, search and tag filter
- **Timer**: stopwatch or Pomodoro per goal; a running timer survives closing the app; "today" and "week" totals in the header
- **Calendar**: month view with heat-map by learned minutes, deadline markers, click a day to see sessions, completed steps and notes
- **Weekly Markdown export** for devlogs, plus a full project export
- **Shortcuts**: `Ctrl+N` new note, `Ctrl+T` start/stop timer (`Cmd` on macOS)
- **Pages** like a lightweight Notion: headings, text, lists, checklists, callouts, images from your assets and embedded tables; drag blocks to reorder, type `/` for the block menu, turn a quick note into a page
- **Tables** with typed columns (text, number, checkbox, choice, date, progress, link), templates for asset lists, tasks, characters and levels, filter, sort and drag rows
- **Nodes canvas** like Obsidian's graph, but with real cards: put goals, pages, tables, notes, research and assets on a canvas, connect them by dragging, and `[[Title]]` links in your text show up as dashed connections automatically; pan, zoom, tidy up
- **Your own navigation**: show, hide, rename and reorder the sections of each project (Settings → Sections)
- **Departments** per project, grouped in a collapsible sidebar (Plan, Knowledge, Assets, Tools): Overview, Goals, Brainstorm, Planner, Cheat sheet, Research, Notes, Pages, Tables, Nodes, Concept art, Inspiration, 3D models, Audio, Unity & Blender. White design with a dark mode toggle, a real menu bar and a `Ctrl+K` command palette
- **Unity & Blender (desktop)**: link your Unity project and Blender folders, drag an asset card onto the Unity/Blender target to copy the file (never overwritten), or drop files from the file manager onto the target tiles. A Blender export folder shows up as an inbox
- **Claude (desktop, optional)**: add your API key (kept in the OS credential store) and use quick commands in the palette, e.g. `/research movement system for a 2D platformer`, `/suggest`, `/unity coyote time`. Results go to the Research panel or are applied as goals and notes after you confirm. Optional web search with sources. Claude always knows how the app works (built-in guide, cached to save tokens), can sort assets and plan ideas, and only proposes changes you confirm. A token and cost overview with an optional monthly limit is in Settings
- **Optional local AI** (Ollama / LM Studio): suggests categories, tags and goal steps. Always suggestions, you confirm. The app is fully usable without it. Prefer Claude Code? See [docs/ai.md](docs/ai.md)
- **7 languages**: English, Deutsch, Italiano, 中文, 日本語, Español, Русский — switch with the gear in the top right (or follow the system language). Claude answers in the chosen language. Translations other than German and English were made with AI help; corrections from native speakers are very welcome
- **Settings** in tabs (General, Project, AI, Data); language and theme are also one click away in the gear menu
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
