<div align="center">

<br/>

# ⌫ Backspace

### The Trust Layer for AI Coding.

**Observe. Record. Revert. Every AI action, under your control.**

<br/>

[![npm version](https://img.shields.io/npm/v/backspace-ai?style=flat-square&color=7c3aed&label=npm)](https://www.npmjs.com/package/backspace-ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-white.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/vaishak-v-nair/Backspace/ci.yml?style=flat-square&label=CI)](https://github.com/vaishak-v-nair/Backspace/actions)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-7c3aed.svg?style=flat-square)](https://github.com/vaishak-v-nair/Backspace/blob/main/CONTRIBUTING.md)

[Website](https://backspace-three.vercel.app) · [Documentation](docs/README.md) · [CLI Reference](docs/cli-reference.md) · [Contributing](CONTRIBUTING.md)

<br/>

<!-- TODO: Record a 15-second terminal GIF showing an AI hallucination being reverted instantly and place it here -->
> 🎬 **[Demo Video Coming Soon]** — Watch Backspace instantly revert a 23-file AI hallucination.

</div>

---

## The Problem

AI coding agents (Claude Code, Cursor, Copilot, Aider) are powerful — but **non-deterministic**. A single hallucination can:

- **Corrupt** your business logic across 23 files
- **Delete** critical config files during a "refactor"
- **Drain** your API budget looping on its own mistakes

`git stash` is too coarse. `Ctrl+Z` doesn't work across files. By the time you notice, the damage is done.

## The Solution

Backspace is a local-first daemon that sits between your AI agent and your filesystem — watching every mutation, logging every diff, and offering instant rollback to safety.

```
Developer → AI Agent → Backspace → Filesystem
                          ↓
                    Observe · Record
                    Verify · Revert
```

**Three commands. That's the entire workflow.**

```bash
# 1. Initialize (once per project)
$ backspace-ai init
✓ Backspace initialized · .backspace/local.db created

# 2. Start watching (before AI session)
$ backspace-ai watch
✓ Daemon started (PID: 42891) · Watching for changes...

  [snap] 4 files → "add auth module"
  [snap] 12 files → "refactor db layer"
  [snap] 23 files → "migrate API routes"     ← AI breaks things here

# 3. Revert instantly
$ backspace-ai revert
✓ 23 files reverted in 47ms
```

---

## Why Backspace?

<table>
<tr>
<td width="50%">

### What it does

- ⚡ **Instant rollback** — Reverse an entire AI session atomically in milliseconds
- 📸 **Session tracking** — Minute-by-minute file changes captured automatically
- 🔒 **Local & encrypted** — AES-256-GCM, your code never leaves your machine
- 🤖 **MCP integration** — AI agents can query their own history and trigger rollbacks
- 🔀 **Git compatible** — Works alongside Git at a much finer granularity
- 🚀 **Zero config** — Literally one command to start. No YAML, no accounts, no setup.

</td>
<td width="50%">

### How it compares

| Feature | Backspace | Git stash | Manual |
|---|:---:|:---:|:---:|
| **Deterministic rollback** | ✓ | ✗ | ✗ |
| **Minute-by-minute tracking** | ✓ | ✗ | ✗ |
| **Local-first encryption** | ✓ | ✗ | ✗ |
| **Zero configuration** | ✓ | ✗ | ✗ |
| **AI Agent integration (MCP)** | ✓ | ✗ | ✗ |

</td>
</tr>
</table>

---

## Quick Start

### Install

```bash
npm install -g backspace-ai
```

### Protect Your Project

```bash
cd your-project
backspace-ai init
backspace-ai watch
```

The daemon is now silently capturing every file change into a local encrypted SQLite database.

### When Things Go Wrong

```bash
# Interactive session picker
backspace-ai revert

# Or revert the latest session instantly
backspace-ai revert --latest

# Or revert a specific session
backspace-ai revert --id abc123
```

---

## How the Revert Engine Works

Backspace uses a **3-Path Inverse Patching** algorithm:

| Path | Scenario | Action |
|------|----------|--------|
| **Path 1** | AI *created* a new file | `fs.unlinkSync` — removes the hallucinated file |
| **Path 2** | AI *deleted* a file | Reconstructs from stored full-text snapshot |
| **Path 3** | AI *modified* a file | `diff.reversePatch` — surgical line-level undo |

All operations are **atomic** — either everything reverts or nothing does. No partial rollbacks.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `backspace-ai init` | Initialize `.backspace/` directory and database |
| `backspace-ai watch` | Start the background file watcher daemon |
| `backspace-ai stop` | Stop the background daemon |
| `backspace-ai status` | Show daemon status, DB size, active session |
| `backspace-ai log` | List all recorded sessions with file counts |
| `backspace-ai show <id>` | Pretty-print diffs for a session |
| `backspace-ai revert` | Interactive session picker → instant restore |
| `backspace-ai revert --latest` | Revert the most recent session |
| `backspace-ai revert --id <id>` | Revert a specific session by ID |
| `backspace-ai check <prompt>` | Pre-flight risk analysis for a prompt |
| `backspace-ai mcp` | Start the MCP server for AI agent integration |
| `backspace-ai integrate <tool>` | Auto-configure integration (e.g., `claude`) |
| `backspace-ai telemetry` | Configure anonymous crash reporting |

See the full [CLI Reference →](docs/cli-reference.md)

---

## AI Tool Integration

Backspace works with **every** AI coding tool:

<table>
<tr>
<td align="center" width="20%"><strong>Claude Code</strong><br/><code>backspace-ai integrate claude</code></td>
<td align="center" width="20%"><strong>Cursor</strong><br/>Auto-detected</td>
<td align="center" width="20%"><strong>Aider</strong><br/>Auto-detected</td>
<td align="center" width="20%"><strong>Copilot</strong><br/>Auto-detected</td>
<td align="center" width="20%"><strong>Any Agent</strong><br/>MCP Server</td>
</tr>
</table>

### Built for the Model Context Protocol (MCP)

Backspace is natively designed for the MCP standard. It exposes a built-in server that lets AI agents query session history, check their own file modification patterns, and even trigger safe rollbacks when they get stuck in a failure loop.

```bash
# Start the MCP server for any agent
backspace-ai mcp

# Or auto-configure it for Claude Code in one click
backspace-ai integrate claude
```

---

## Architecture

```
backspace/
├── packages/
│   └── cli/                    # Core Node.js daemon & CLI
│       ├── src/
│       │   ├── index.ts        # Commander entrypoint (binary: backspace-ai)
│       │   ├── daemon.ts       # Chokidar watcher + diff pipeline
│       │   ├── supervisor.ts   # Detached process manager
│       │   ├── db.ts           # SQLite WAL storage layer
│       │   ├── crypto.ts       # AES-256-GCM encryption pipeline
│       │   ├── sniffer.ts      # AI prompt detection engine
│       │   ├── analysis.ts     # Risk scoring & pattern analysis
│       │   ├── mcp.ts          # Model Context Protocol server
│       │   └── commands/       # CLI command handlers
│       └── dist/               # Built output (tsup)
├── apps/
│   └── web/                    # Next.js marketing site
├── packages/
│   └── extension/              # VS Code extension (coming soon)
└── docs/                       # Documentation
```

### Key Design Decisions

- **Local-first**: SQLite WAL mode for concurrent writes during rapid AI mutations
- **Encryption**: AES-256-GCM with per-project keys + Brotli compression
- **Detached daemon**: Supervisor pattern — `watch` returns immediately, daemon lives in background
- **Prompt sniffing**: Passive detection of AI tool prompts for session labeling

See the full [Architecture Guide →](docs/architecture.md)

---

## Token Savings Calculator

When AI breaks code, you waste tokens re-prompting and debugging. Backspace eliminates that cost.

```
Formula:
  tokens_saved = files_changed × 3,000 tokens/file × 3 debug iterations
  cost_saved   = (tokens_saved / 1,000,000) × $3.00 (Claude Sonnet rate)
  time_saved   = files_changed × 1.5 minutes

Example (20 files):
  tokens_saved = 180,000
  cost_saved   = $0.54 per session
  time_saved   = 30 minutes
```

Over a month of daily AI coding, Backspace can save **$15-50 in API costs** and **hours of debugging time**.

---

## Roadmap

- [x] Core CLI (init, watch, stop, revert, log, show)
- [x] AES-256-GCM encryption
- [x] MCP server
- [x] Prompt sniffing (Claude, Cursor, Aider)
- [x] Pre-flight risk analysis (`check` command)
- [ ] AI Flight Recorder — complete session forensics
- [ ] Smart Rollback — automatic risk detection
- [ ] Session Replay — step-by-step playback
- [ ] AI Blame — line-level AI vs human attribution
- [ ] VS Code Extension
- [ ] Plugin ecosystem

See the full [Product Roadmap →](docs/roadmap.md)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues** are labeled and waiting — everything from adding new AI tool sniffers to improving terminal output.

```bash
# Clone and setup
git clone https://github.com/vaishak-v-nair/Backspace.git
cd Backspace
npm install

# Build the CLI
cd packages/cli
npm run build

# Run locally
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

*why debug when you can revert.*

</div>
