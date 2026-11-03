# Changelog

## [Unreleased]
### Added
- Projects, goals with steps and progress bars, asset board with drag & drop, notes with tags
- Optional local AI (Ollama / LM Studio) suggestions
- JSON export/import, Markdown project export, DE/EN, light/dark theme
- CI, release and GitHub Pages workflows
- Timer (stopwatch / Pomodoro) with persisted running state, today/week totals
- Calendar with minute heat-map, deadlines and per-day details
- Weekly Markdown export, keyboard shortcuts (Ctrl+N, Ctrl+T)
- Window size and position are remembered in the desktop app
- White design with dark mode, navigation with departments, menu bar, command palette, Inspiration and Research panels
- Unity and Blender folder integration with drag and drop transfer and a Blender inbox
- Claude integration (API key in the OS credential store, research / suggestions / Unity outline commands, optional web search)
- Pages with simple blocks (text, headings, lists, checklists, callouts, images, embedded tables), `/` block menu, links and backlinks
- Tables with typed columns, templates, filter, sort and drag-to-reorder rows
- Nodes canvas: cards for goals, pages, tables, notes, research and assets; drawn connections plus automatic `[[Title]]` links; pan, zoom, tidy up
- Sections per project can be shown, hidden, renamed and reordered
- Markdown project export includes pages and tables; Claude context lists page and table names (no contents)
- Unity 6.6 cheat sheet (German) with ~40 step-by-step entries and 30+ scripts that compile in Unity 6000.6; own entries; add as goal or put on the canvas
- Start from an existing Unity project (links the folder, optionally takes over files from Assets/), then an optional "Connect Claude?" step
- Claude knows the app (cached built-in guide), proposes actions (goals, pages, tables, notes, canvas links, asset sorting) that are applied only after confirmation
- Claude token and cost overview with monthly limit
- Brainstorm section: local full-text search over cheat sheet and project, plan generation with Claude
- 3D model preview (GLB/glTF/FBX/OBJ, .blend through Blender) with orbit controls and concept-art comparison
- Krita integration (.kra thumbnails, art-folder inbox, open in Krita) and drop-anywhere import
- Interface and cheat sheet in 7 languages (English, German, Italian, Chinese, Japanese, Spanish, Russian), "Auto" follows the system language; Claude answers in the chosen language
- Clearer layout: collapsible navigation groups, compact header with a status pill and a gear menu (language, theme, all settings), settings split into tabs, CJK fonts
- Hub start page with program tiles and an inbox for new Blender/Krita exports; separate Unity, Blender and Krita pages; breadcrumbs
- Plugin bridge with one-click install of a Unity editor package, a Blender add-on and a Krita plugin: export on save, model checks, Unity import presets, console errors in the dashboard, prefab/open scene/export jobs
- Auto import of new exports into the project (optionally straight into Unity)
### Changed
- Cheat sheet scripts use English comments and log texts
