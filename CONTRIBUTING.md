# Contributing

Thanks for helping! Keep it simple and local-first.

1. Fork, create a branch, `npm install`.
2. `npm run dev` for the web version; `npm run tauri dev` needs Rust.
3. Before a PR: `npm run lint && npm run typecheck && npm test && npm run build`.
4. Conventional Commits (`feat:`, `fix:`, `docs:` …), code and commits in English.
5. UI text goes in both `src/i18n/en.ts` and `src/i18n/de.ts`.

Principles: no accounts, no cloud, no telemetry; data-model changes need a version bump and a migration in `src/model/migrate.ts` with a test. Look for the `good first issue` label.

## Cheat sheet content

The Unity cheat sheet lives in `src/cheatsheet/*.ts`. Every C# snippet must compile in the Unity version the sheet targets (currently 6000.6):

1. Create an empty Unity 6.6 project and add `com.unity.inputsystem` and `com.unity.ai.navigation` to its `Packages/manifest.json` (Cinemachine and uGUI are built in).
2. `node scripts/export-cheat-scripts.mjs <path-to-that-project>` writes all scripts to `Assets/CheatSheet`.
3. Open the project (or run Unity with `-batchmode -quit -projectPath <path> -logFile -`) and make sure there are no compiler errors or warnings.

Check API names against the official documentation, not memory, and keep the explanations beginner-friendly.
