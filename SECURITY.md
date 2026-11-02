# Security

## Reporting
Please report vulnerabilities privately via GitHub's "Report a vulnerability" (Security tab) instead of a public issue.

## Design
- Everything stays on your machine, with one optional exception: the Claude commands you trigger yourself send a project summary to Anthropic (see below). No telemetry, no remote content, strict Content-Security-Policy.
- Tauri capabilities are minimal (dialogs, window state). File access goes through a few Rust commands: atomic save of `data.json`, existence checks, size/type-limited previews of image/audio files, and export/import limited to `.json`/`.md` paths chosen in native dialogs.
- Stored and imported JSON is validated with a schema and size limits before use; invalid data is never overwritten silently.
- Linked asset paths are only read for previews, never executed.
- Claude (desktop only, optional): the Anthropic API key is stored in the OS credential store (Windows Credential Manager, macOS Keychain, Linux keyutils) and is only read by the Rust backend, which sends requests to `https://api.anthropic.com/v1/messages` and nowhere else. The key never enters the webview, `data.json`, exports or logs. Requests contain a text summary of the active project (titles, names, notes), never file contents or paths. Responses are validated and applied only after confirmation. The web demo has no Claude feature.
- Unity / Blender transfer (desktop only): files are copied, never moved or overwritten, only into folders you linked; sub folders cannot contain `..` or absolute paths and symlink escapes are rejected; the Unity target must contain `Assets` and `ProjectSettings`. Programs are only started if the executable is named `Unity` / `blender`, without a shell or free-form arguments.
- 3D preview and Krita (desktop): model files are read only for `glb/gltf/bin/fbx/obj/mtl/png/jpg` up to 200 MB, and the textures/buffers of a glTF only from inside the model's own folder. `.kra` previews read just the `mergedimage.png` entry of the archive. Converting `.blend` runs the Blender you linked (executable must be named `blender`) with a fixed export script and writes only into the app's cache folder; Krita is only started when the executable is named `krita`.
- Claude usage: each request stores model, command name and token counts for the cost overview, never prompt text.
- Links: only `http(s)` URLs are stored and opened (via the system browser); the app never fetches them.
- Local AI: only talks to the `http(s)` server you configure (normally `localhost`). Model output is validated, treated as untrusted suggestions and applied only after confirmation. Asset names and notes sent to the model are data, not instructions.
- Release installers are currently unsigned.
