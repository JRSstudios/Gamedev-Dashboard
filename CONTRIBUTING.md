# Contributing

Thanks for helping! Keep it simple and local-first.

1. Fork, create a branch, `npm install`.
2. `npm run dev` for the web version; `npm run tauri dev` needs Rust.
3. Before a PR: `npm run lint && npm run typecheck && npm test && npm run build`.
4. Conventional Commits (`feat:`, `fix:`, `docs:` …), code and commits in English.
5. UI text goes in both `src/i18n/en.ts` and `src/i18n/de.ts`.

Principles: no accounts, no cloud, no telemetry; data-model changes need a version bump and a migration in `src/model/migrate.ts` with a test. Look for the `good first issue` label.
