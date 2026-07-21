# ⌫ backspace-ai

> **Recovery intelligence for AI-assisted coding.** Git tracks commits. Backspace tracks AI actions.

When an AI agent edits 15 files across 6 directories and a test fails 20 minutes later, git hands you 12 diffs and wishes you luck. Backspace groups those edits into a **session**, shows you exactly what the AI touched and why, and reverts the whole session atomically.

All data stays on your machine. SQLite, AES-256-GCM encrypted, zero telemetry.

## Install

```bash
npm install -g backspace-ai
```

Requires Node.js ≥ 22.5.

## Quick start

```bash
# once per project
backspace-ai init

# before an AI session
backspace-ai watch --prompt "add JWT auth"

# ...let Claude Code / Cursor / Aider / Copilot work...

backspace-ai stop

# something broke? undo the whole session
backspace-ai revert
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize `.backspace/` and the encrypted database |
| `watch` | Start the background watcher daemon (one session per watch) |
| `stop` | Stop the daemon, close the session |
| `status` | Daemon state, DB size, active session |
| `log` | List recorded sessions |
| `show <id>` | Events and diffs for a session |
| `revert [--latest\|--id <id>]` | Atomic rollback of a session |
| `timeline` | Chronological view of all AI activity |
| `inspect <event-id>` | Full provenance for one file event |
| `check <prompt>` | Pre-flight risk analysis of an AI prompt |
| `mcp` | Start the MCP server for AI agent integration |
| `integrate claude` | Wire the MCP server into Claude Code (`.mcp.json`) |

## MCP integration

```bash
backspace-ai integrate claude
```

Claude Code then gets `list_sessions`, `get_session_events`, `list_snapshots`, `get_snapshot_diff`, and `revert_session` tools — it can inspect its own past changes and ask for a rollback instead of debugging in circles.

## Docs, issues, contributing

Full documentation, architecture notes, and contribution guide live in the
[GitHub repository](https://github.com/vaishak-v-nair/Backspace).

MIT © [Vaishak V Nair](https://github.com/vaishak-v-nair)
