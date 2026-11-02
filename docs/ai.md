# AI options

The app works fully without AI. Two optional ways to let a model sort your notes and assets:

## 1. Local AI inside the app (Ollama / LM Studio)
1. Install [Ollama](https://ollama.com) and start it (or LM Studio with its local server enabled).
2. In the app click **🤖 Local AI → Connect**. It checks `localhost:11434` and `localhost:1234`, lists models, and can download a small recommended model (Ollama).
3. Use *Suggest categories & tags*, *Suggest tags for notes* or ✨ *Break into steps* on a goal. You review every suggestion before it is applied.

Web demo: browsers block requests to local servers unless allowed. Start Ollama with `OLLAMA_ORIGINS=https://<your-user>.github.io` (or `*` for testing). The desktop app may also need this on Windows, where the webview origin is `http://tauri.localhost`.

Model suggestions come from `src/ai/recommended-models.json`.

## 2. Claude (API key, desktop app)
1. Open **Settings → Claude**, paste your API key from the Anthropic console and save. It is stored in your operating system's credential store, not in the app data.
2. Press `Ctrl+K` and type a command: `/research <topic>`, `/suggest [focus]` or `/unity <topic>`. Or pick the Claude entries from the list.
3. Research and Unity outlines can be saved to the **Research** panel (with sources when web search is on); suggestions are listed and only added as goals or notes after you confirm.

What is sent: a text summary of the active project (titles, asset names, notes). Open *What will be sent* in the dialog to see it. No files and no file paths. Every request is billed to your Anthropic account; web search is billed extra and must be enabled in the Anthropic console. If a request is refused or fails, you see the reason and nothing is changed.

## 3. Claude Code (or any coding agent)
Use **Menu → Export project (Markdown)** to get a `Project.md` snapshot (goals, asset paths, notes). Put it in your game folder and ask Claude Code, for example:

> Read Project.md. Propose a folder structure for the assets listed, suggest tags and categories, and list files that look duplicated. Don't move anything until I confirm.

Nothing is sent anywhere by the app itself.
