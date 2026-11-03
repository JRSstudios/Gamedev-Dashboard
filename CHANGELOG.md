# Changelog

## [Unreleased]

## [0.1.0] - 2026-11-03
First public beta. Installers are unsigned (see README).
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
- Local asset sorting without AI (file type, words in file and folder names in several languages, audio length) that learns from your corrections; hub suggestions (deadline at risk, goals without steps or estimate, stalled goals, wrong category, missing files, Unity errors, failed model checks); Claude sorting in batches
- Planner with Week and Month tabs: working/school times and gamedev times per weekday, single days changed or off, templates; available, logged and free hours
- Time per section: planned hours per goal and section, time logged on them (timer with section choice), warnings when deadlines do not fit; "3 h of 8 h" on goal cards
- Templates: five bundled templates (2D platformer, top-down RPG, 3D third person, 48 h game jam, pixel art workflow), a community catalog in `templates/` on GitHub, import/export as `.gdtemplate.json`, install into the current or a new project and remove again; C# scripts are shown first and copied into Unity only on click
- Tutorial section with 12 lessons and a guided tour in all 7 languages, plus a "first game" course built from the cheat sheet
- Claude through your own Claude Code subscription (`claude -p`, no tools) as an alternative to an API key; assistant side panel (`Ctrl+J`) with project context, Unity errors, reviewable actions and "save script in Unity"
- `Ctrl+Z` / `Ctrl+Y` undo and redo for all data changes; daily snapshots (last 14) with restore and an optional backup folder
- Quick note from anywhere with `Ctrl+Shift+Space`
- Import from Obsidian vaults and Notion exports (Markdown pages with their folder tree, CSV as tables)
- Pages: formatted text (**bold**, *italic*, `code`, links, clickable `[[links]]`), sub-pages, daily devlog page, page templates (design document, character, level, postmortem)
- Table views: kanban board, calendar and gallery
- Project analysis: scans the linked Unity project (packages, scripts, scenes, TODO comments) and proposes goals, filled tables (scripts, scenes, assets), notes and a learning path; steps from the cheat sheet for new goals, tag suggestions for notes, table templates picked from the name
- Showcase section: slides from concept art, 3D models, progress and music with animated transitions; full-screen presenter for screen recording in 16:9, 9:16 or 1:1
- Bugs section: reports become a pre-filled GitHub issue (personal data removed); after an error or a crash the app offers to prepare a report
- Cheat sheet: object pooling, enemy state machine, moving platforms, parallax, checkpoints, scene fades, dialogues, interaction
- Animated tutorial lessons, tour highlight and confetti; refreshed design with section icons and motion
- Visible labels instead of grey hints, explained empty states, example content in page and project templates
- Unity build with scene check from the dashboard; Blender helpers (apply rotation/scale, origin to floor, LODs, export each collection); Krita sprite sheet export
### Changed
- 3D preview: panning moves the picture and keeps the model as the rotation centre
- Tighter Content-Security-Policy, the window cannot be navigated away from the app, CodeQL scanning
- Cheat sheet scripts use English comments and log texts
