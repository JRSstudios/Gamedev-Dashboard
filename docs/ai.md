# AI options

The app works fully without AI. Two optional ways to let a model sort your notes and assets:

## 1. Local AI inside the app (Ollama / LM Studio)
1. Install [Ollama](https://ollama.com) and start it (or LM Studio with its local server enabled).
2. In the app click **🤖 Local AI → Connect**. It checks `localhost:11434` and `localhost:1234`, lists models, and can download a small recommended model (Ollama).
3. Use *Suggest categories & tags*, *Suggest tags for notes* or ✨ *Break into steps* on a goal. You review every suggestion before it is applied.

Web demo: browsers block requests to local servers unless allowed. Start Ollama with `OLLAMA_ORIGINS=https://<your-user>.github.io` (or `*` for testing). The desktop app may also need this on Windows, where the webview origin is `http://tauri.localhost`.

Model suggestions come from `src/ai/recommended-models.json`.

## 2. Claude Code (or any coding agent)
Use **Menu → Export project (Markdown)** to get a `Project.md` snapshot (goals, asset paths, notes). Put it in your game folder and ask Claude Code, for example:

> Read Project.md. Propose a folder structure for the assets listed, suggest tags and categories, and list files that look duplicated. Don't move anything until I confirm.

Nothing is sent anywhere by the app itself.
