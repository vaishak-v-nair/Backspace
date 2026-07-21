# Changelog

All notable changes to this project are documented here. The CLI package
(`backspace-ai`) is versioned independently and released with `cli-vX.Y.Z` tags.

## cli-v0.1.0 — 2026-07-21

First public release.

### Features

- `init` — encrypted local SQLite store in `.backspace/` (auto-gitignored)
- `watch` / `stop` — background daemon groups AI file changes into sessions
- `revert` — atomic session rollback (interactive picker, `--latest`, `--id`)
- `log`, `show`, `timeline`, `inspect` — session and event provenance
- `check` — pre-flight risk analysis of AI prompts against known failure patterns
- `mcp` + `integrate claude` — MCP server so AI agents can inspect their own changes
- Prompt sniffing for Aider, Cursor, and GitHub Copilot logs
- AES-256-GCM encryption of all captured diffs; `.env*` never captured
- E2E smoke test (`npm run smoke`) proving init → watch → edit → stop → revert
  restores files byte-for-byte, run in CI on Linux and Windows
