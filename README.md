<div align="center">

<br/>

# ⌫ Backspace

### Recovery Intelligence for AI-Assisted Development.

**Git tracks commits. Backspace tracks AI actions.**

<br/>

[![npm version](https://img.shields.io/npm/v/backspace-ai?style=flat-square&color=7c3aed&label=npm)](https://www.npmjs.com/package/backspace-ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-white.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-7c3aed.svg?style=flat-square)](https://github.com/vaishak-v-nair/Backspace/blob/main/CONTRIBUTING.md)

[Website](https://backspace-three.vercel.app) · [CLI Reference](docs/cli-reference.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## The Problem

The problem isn't undoing code. Git does that.

The problem is **knowing which AI action caused the regression** when the agent made 15 edits across 6 files and everything looked fine until a test failed 20 minutes later.

```
You: "Add JWT authentication"

AI: modifies 12 files across auth/, middleware/, routes/, config/

20 minutes later: tests fail

You: "Which of those 12 changes broke it?"

Git: "Here are 12 diffs. Good luck."

Backspace: "Session 'Add JWT auth' modified 12 files.
            auth/middleware.ts has a suspicious sync→async change.
            Risk: HIGH — this pattern breaks callers 34% of the time."
```

---

## What Git Can't Do

### 1. Cross-tool session tracking

Cursor has checkpoints. Claude Code has checkpoints. Aider uses git commits.

None of them talk to each other. Switch tools mid-project and your recovery history is fragmented.

Backspace is one recovery model across every AI tool — Cursor, Claude Code, Aider, Copilot, or any MCP-compatible agent.

### 2. Suspicious change detection

You asked the AI to "add dark mode." It also modified `auth.ts` and `middleware.ts`.

Git won't flag that. Backspace will.

### 3. Structured AI sessions

Git sees commits. Backspace sees AI actions — grouped by intent, labeled by prompt, scored by risk.

A commit is "what changed." A session is "what the AI was trying to do and everything it touched while doing it."

---

## Quick Start

```bash
npm install -g backspace-ai
```

```bash
# 1. Initialize (once per project)
$ backspace-ai init
✓ Backspace initialized · .backspace/local.db created

# 2. Start watching (before AI session)
$ backspace-ai watch
✓ Daemon started (PID: 42891) · Watching for changes...

  [snap] 4 files → "add auth module"
  [snap] 12 files → "refactor db layer"
  [snap] 23 files → "migrate API routes"     ← breaks here

# 3. Revert the bad session
$ backspace-ai revert
✓ 23 files reverted in 47ms
⚠ Most changes were in routes/ — AI modified API endpoint signatures
  This pattern causes breakages in 37% of sessions like this one
```

---

## How It Works

Backspace runs a lightweight daemon that watches your filesystem. When an AI tool modifies files, Backspace:

1. **Groups changes into sessions** — not loose diffs, structured AI actions
2. **Captures before/after state** for every file mutation
3. **Detects the AI tool** being used (Claude, Cursor, Aider) via prompt sniffing
4. **Scores risk** — sync→async changes, auth modifications, DB queries, env vars
5. **Enables instant recovery** — atomic rollback of any session

```
AI Agent ──→ Filesystem
               │
          Backspace Daemon
               │
     ┌─────────┼─────────┐
     │         │         │
  Session   Event     Risk
  Tracker   Logger   Analyzer
     │         │         │
     └─────────┼─────────┘
               │
        SQLite (WAL mode)
        AES-256-GCM encrypted
```

All data stays on your machine. Zero cloud. Zero telemetry.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `backspace-ai init` | Initialize `.backspace/` directory and encrypted database |
| `backspace-ai watch` | Start the background daemon — captures all file changes |
| `backspace-ai stop` | Stop the daemon, close the active session |
| `backspace-ai status` | Show daemon state, DB size, active session |
| `backspace-ai log` | List all recorded sessions with file counts |
| `backspace-ai show <id>` | Pretty-print events and diffs for a session |
| `backspace-ai revert` | Interactive session picker → atomic rollback |
| `backspace-ai revert --latest` | Revert the most recent session |
| `backspace-ai revert --id <id>` | Revert a specific session by ID |
| `backspace-ai timeline` | Chronological timeline of all AI activity |
| `backspace-ai inspect <id>` | Detailed provenance for a single event |
| `backspace-ai check <prompt>` | Pre-flight risk analysis before starting a session |
| `backspace-ai mcp` | Start the MCP server for AI agent integration |
| `backspace-ai integrate <tool>` | Auto-configure integration (e.g., `claude`) |

See the full [CLI Reference →](docs/cli-reference.md)

---

## Cross-Tool Support

Backspace works with **every** AI coding tool:

| Tool | Integration |
|------|-------------|
| **Claude Code** | `backspace-ai integrate claude` |
| **Cursor** | Auto-detected |
| **Aider** | Auto-detected |
| **Copilot** | Auto-detected |
| **Any MCP Agent** | `backspace-ai mcp` |

One recovery model. Any tool. Switch freely.

---

## Pre-Flight Risk Analysis

Before you even start an AI session, Backspace can analyze your prompt:

```bash
$ backspace-ai check "refactor the auth module to use JWT"

⚠ MEDIUM RISK prompt detected (auth-refactor)

Common failure patterns for this type of change:
  - Existing session tokens invalidated
  - Middleware chain broken by new auth checks
  - Environment variables added without documentation

Suggested constraints to add to your prompt:
  → "Do not modify existing middleware signatures"
  → "Keep backward compatibility with current session tokens"
```

---

## Roadmap

- [x] Core CLI (init, watch, stop, revert, log, show)
- [x] AES-256-GCM local encryption
- [x] AI prompt sniffing (Claude, Cursor, Aider)
- [x] Pre-flight risk analysis (`check` command)
- [x] Post-revert pattern analysis
- [x] MCP server for AI agent integration
- [x] Event timeline and inspection
- [ ] Selective revert (`--file`, `--hunk`)
- [ ] Suspicious change warnings during `watch`
- [ ] Session comparison (`diff <a> <b>`)
- [ ] VS Code Extension

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/vaishak-v-nair/Backspace.git
cd Backspace
npm install

cd packages/cli
npm run build

node dist/index.js init
```

---

## Community

- 🐛 [Report a bug](https://github.com/vaishak-v-nair/Backspace/issues/new?template=bug_report.yml)
- 💡 [Request a feature](https://github.com/vaishak-v-nair/Backspace/issues/new?template=feature_request.yml)
- 💬 [Discussions](https://github.com/vaishak-v-nair/Backspace/discussions)

---

## License

MIT © [Vaishak V Nair](https://github.com/vaishak-v-nair)

---

<div align="center">

**If Backspace saved your project, consider giving it a ⭐**

*git tracks commits. backspace tracks AI actions.*

</div>
