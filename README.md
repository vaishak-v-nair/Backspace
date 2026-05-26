<div align="center">

# ⌫ Backspace

**The Deterministic Undo Button for AI Agents.**

Stop burning tokens trying to fix what Claude Code just broke.

[![CI Status](https://github.com/vaishak-v-nair/backspace/actions/workflows/ci.yml/badge.svg)](https://github.com/vaishak-v-nair/backspace/actions)
[![Version](https://img.shields.io/npm/v/backspace-ai?style=for-the-badge)](https://www.npmjs.com/package/backspace-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Website](https://backspace.dev) • [Documentation](#quick-start) • [Discord](#community)
</div>

<br/>

## 🚀 The Problem

AI Agents (Claude Code, Cursor, Aider) are fast, but they are **non-deterministic**. A single hallucination can:

1.  **Corrupt** your business logic with 500 lines of junk.
2.  **Delete** critical configuration files during a "refactor."
3.  **Drain** your API budget as the agent loops endlessly trying to "fix" its own mistakes.

Standard `git checkout` is too coarse. It doesn't understand the *intent* of the AI's changes, and by the time you've committed, the damage is done across 15 files.

---

## 🛠 The Solution: Backspace

Backspace is a high-performance local daemon and **Model Context Protocol (MCP)** server that provides a "Time Machine" for your codebase. It sits between your agent and your file system — watching every move, logging every diff in a high-concurrency **SQLite WAL** database, and offering a one-command snapback to safety.

### ✨ Key Features

| Feature | Description |
|---|---|
| **3-Path Revert Engine** | Handles file additions, deletions (via Git-Bridge ghost recovery), and modifications with surgical `diff.reversePatch` precision. Unlike `git checkout`, it understands the AI's intent. |
| **MCP-Native Awareness** | Claude Code becomes "self-aware." The integrated MCP server exposes `list_snapshots` and `get_snapshot_diff` tools, so the AI can query its own history and proactively suggest rollbacks. |
| **Zero-Overhead Watcher** | A 250ms-debounced, `.gitignore`-aware `chokidar` daemon that groups batched AI refactors into single atomic transactions. <1% CPU on massive monorepos. |
| **Passive Prompt Sniffer** | Automatically captures the AI prompt that *caused* each change by tailing logs from Aider, Cursor, and GitHub Copilot — zero proxy, zero SSL certificates. |
| **Token Efficiency** | Stop paying $0.50 for an LLM to "debug" a syntax error it created. Hit `backspace revert` and save the tokens. |
| **Local-First, Cloud-Synced** | SQLite WAL locally for speed, Supabase with Row-Level Security for multi-tenant cloud sync. |

---

## ⌨️ Quick Start

You don't need to configure environment variables or mess with local proxies. Backspace uses an auto-discovery engine.

### 1. Install & Authenticate

```bash
npx backspace-ai login
```
*This opens your browser to securely authenticate via Clerk and initializes your local `.backspace` engine.*

### 2. Protect Your Project

Navigate to any repository you want to protect and initialize the daemon:

```bash
cd your-project
backspace init
backspace watch
```

The daemon is now silently micro-snapshotting every file change into a local SQLite database with WAL mode for maximum concurrency.

### 3. Integrate Claude Code (Recommended)

Give Claude Code a "prefrontal cortex" by injecting the Backspace MCP server:

```bash
backspace integrate claude
```

This writes to `.mcp.json` in your project root. Claude will automatically use `list_snapshots` and `get_snapshot_diff` to become self-aware of its own change history.

---

## 🔁 Usage: The Revert

When an AI hallucination destroys your code, simply run:

```bash
backspace revert
```

Backspace presents an interactive TUI with the last 10 AI actions and their prompts. Select the stable state, and your files are instantly restored using the **3-Path Inverse Patching** algorithm:

| Path | Scenario | Action |
|---|---|---|
| **Path 1** | AI *created* a new file | `fs.unlinkSync` — delete it |
| **Path 2** | AI *deleted* a file | Reconstruct from stored full-text or Git-Bridge ghost recovery |
| **Path 3** | AI *modified* a file | `diff.reversePatch` — surgical line-level undo |

---

## 🏗️ Architecture

This project is a scalable monorepo using npm workspaces:

```text
/
├── apps/
│   └── web/             # Next.js 16 Landing Page
│                        #   React 19, Framer Motion, React Three Fiber
│                        #   Clerk Auth, Supabase Waitlist, Token Calculator
├── packages/
│   └── cli/             # Core Node.js daemon & MCP server
│                        #   SQLite WAL diff engine, chokidar watcher
│                        #   Passive prompt sniffer (Aider/Cursor/Copilot)
│                        #   3-Path revert engine with Git-Bridge
├── supabase/            # PostgreSQL RLS policies & edge functions
│                        #   Zero-trust multi-tenant snapshot storage
└── .github/workflows/   # CI/CD with npm provenance signing
```

### The Diff Engine (How It Works)

```
┌──────────────┐     chokidar      ┌──────────────┐
│  AI Agent    │ ──── writes ────▶ │  File System │
│ (Claude,     │                   │              │
│  Cursor,     │                   └──────┬───────┘
│  Aider)      │                          │
└──────┬───────┘                   250ms debounce
       │                                  │
       │ passive log tail          ┌──────▼───────┐
       ▼                           │   Daemon     │
┌──────────────┐                   │  processBatch│
│ Prompt       │ ── tags ────────▶ │              │
│ Sniffer      │  prompt_context   │  diff.create │
└──────────────┘                   │  Patch()     │
                                   └──────┬───────┘
                                          │
                                   ┌──────▼───────┐
                                   │ SQLite (WAL) │
                                   │ snapshots    │
                                   └──────┬───────┘
                                          │
                                   ┌──────▼───────┐
                                   │ MCP Server   │
                                   │ (stdio)      │
                                   │              │
                                   │ list_snapshots│
                                   │ get_snapshot  │
                                   │    _diff      │
                                   └──────────────┘
```

---

## 🔒 Security Posture

Backspace handles proprietary code, which requires absolute security:

* **Zero-Trust Auth:** Managed by Clerk with mandatory short-lived JWTs.
* **Row-Level Security (RLS):** Supabase DB ensures tenant isolation at the database level. Every query is scoped to `requesting_user_id()` extracted from the JWT `sub` claim.
* **Safe Sandboxing:** Telemetry is completely anonymous and strictly strips all file names, paths, and code snippets before transmission.
* **Prompt Sanitization:** All captured prompts are stripped of HTML/XML tags and unicode control characters to prevent injection attacks.

---

## 🤝 Contributing

We welcome contributions from the community.

**Local Development Setup:**

```bash
git clone https://github.com/vaishak-v-nair/backspace.git
cd backspace
npm install

# Run everything (web + CLI in watch mode)
npm run dev

# Or run individually
npm run dev --workspace=web     # Next.js on :3000
npm run dev --workspace=@backspace/cli  # CLI in tsx watch mode
```

---

## 📜 CLI Reference

| Command | Description |
|---|---|
| `backspace init` | Initialize `.backspace/` directory and SQLite database in the current project |
| `backspace watch` | Start the file watcher daemon (debounced, .gitignore-aware) |
| `backspace revert` | Interactive TUI to select and apply inverse patches |
| `backspace login` | Authenticate via browser OAuth (Clerk → local token) |
| `backspace join` | Join the beta waitlist and receive a unique key |
| `backspace integrate claude` | Auto-configure `.mcp.json` for Claude Code MCP |
| `backspace mcp` | Start the MCP server over stdio (used by AI agents) |
| `backspace telemetry [status\|enable\|disable]` | Manage anonymous crash reporting |

---

## 📄 License

MIT License © 2026 Vaishak V Nair
