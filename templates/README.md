# Community templates

Templates for the Gamedev Dashboard: goals with steps, pages, tables, time budgets and optional Unity C# scripts for a kind of game. The app reads `index.json` and the `*.gdtemplate.json` files from this folder on GitHub (Templates → "Load community catalog").

## Share your own

1. In the app: Templates → **Export as template**. Only texts go in, no files or paths.
2. Put the exported `.gdtemplate.json` into `templates/src/` as `<your-id>.json` (lower case, digits and dashes).
3. To include Unity scripts, list cheat sheet scripts by file name in `contents.unityScripts`, e.g. `["PlayerInputReader.cs"]`. They are already tested in Unity 6000.6.
4. Run `node templates/build.mjs`, check the app still loads it (`npm test`), and open a pull request.

Templates must not contain personal data, links to downloads or code other than C# scripts.
