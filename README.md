<div align="center">

# ⌫ Backspace

**The Deterministic Undo Button for AI Agents.**

Stop burning tokens trying to fix what Claude Code just broke.

[![Version](https://img.shields.io/npm/v/backspace-ai?style=for-the-badge)](https://www.npmjs.com/package/backspace-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Website](https://backspace.dev) • [Documentation](#quick-start)
</div>

<br/>

## 🚀 The Problem

AI Agents (Claude Code, Cursor, Aider) are fast, but they are **non-deterministic**. A single hallucination can:

1.  **Corrupt** your business logic with hundreds of lines of junk.
2.  **Delete** critical configuration files during a "refactor."
3.  **Drain** your API budget as the agent loops endlessly trying to "fix" its own mistakes.

Standard `git checkout` is too coarse. It doesn't understand the *intent* of the AI's changes, and by the time you've committed, the damage is done across multiple files.

---

## 🛠 The Solution: Backspace

Backspace is a local daemon that provides a "Time Machine" for your codebase. It sits between your agent and your file system — watching every move, logging every diff in a **SQLite WAL** database, and offering a one-command snapback to safety.

### ✨ Key Features

| Feature | Description |
|---|---|
| **3-Path Revert Engine** | Handles file additions, deletions (via Git-Bridge ghost recovery), and modifications with surgical `diff.reversePatch` precision. |
| **Zero-Overhead Watcher** | A 250ms-debounced, `.gitignore`-aware `chokidar` daemon that groups batched AI refactors into single atomic transactions. |
| **Prompt Tagging** | Every session is tagged with your natural language description, making sessions instantly searchable. |
| **Local Only** | All snapshot data stays on your machine in a local SQLite file. Nothing is sent to any server. No account required. |
| **Token Efficiency** | Stop paying to debug an error the AI created. Hit `backspace-ai revert` and save the tokens. |
| **Git Compatible** | Works alongside Git, doesn't replace it. Backspace captures the messy middle between commits. |

---

## ⌨️ Quick Start

### 1. Install

```bash
npm install -g backspace-ai
```

### 2. Protect Your Project

Navigate to any repository you want to protect and initialize:

```bash
cd your-project
backspace-ai init
backspace-ai watch
```

The daemon is now silently micro-snapshotting every file change into a local SQLite database.

---

## 🔁 Usage: The Revert

When an AI hallucination destroys your code, simply run:

```bash
backspace-ai revert
```

Backspace presents an interactive TUI with recent snapshots. Select the stable state, and your files are instantly restored using the **3-Path Inverse Patching** algorithm:

| Path | Scenario | Action |
|---|---|---|
| **Path 1** | AI *created* a new file | `fs.unlinkSync` — delete it |
| **Path 2** | AI *deleted* a file | Reconstruct from stored full-text or Git-Bridge ghost recovery |
| **Path 3** | AI *modified* a file | `diff.reversePatch` — surgical line-level undo |

---

## 🏗️ Architecture

This project is a monorepo using npm workspaces:

```text
/
├── apps/
│   └── web/             # Next.js 16 Landing Page
│                        #   React 19, Framer Motion, Tailwind
├── packages/
│   └── cli/             # Core Node.js daemon
│                        #   SQLite WAL diff engine, chokidar watcher
│                        #   Passive prompt sniffer (Aider/Cursor/Copilot)
│                        #   3-Path revert engine with Git-Bridge
└── supabase/            # Waitlist storage
```

---

## 📜 CLI Reference

| Command | Description |
|---|---|
| `backspace-ai init` | Initialize `.backspace/` directory and SQLite database |
| `backspace-ai watch` | Start the background file watcher daemon |
| `backspace-ai stop` | Stop the background daemon |
| `backspace-ai status` | Show current init state, daemon status, and DB size |
| `backspace-ai log` | List all recorded snapshots |
| `backspace-ai show <id>` | Pretty-print diffs for a specific snapshot |
| `backspace-ai revert` | Interactive TUI to select and apply inverse patches |
| `backspace-ai login` | Authenticate via browser OAuth |
| `backspace-ai integrate claude` | Auto-configure `.mcp.json` for Claude Code |
| `backspace-ai mcp` | Start the MCP server over stdio |
| `backspace-ai telemetry [status\|enable\|disable]` | Manage anonymous crash reporting |

---

## 📄 License

MIT License © 2026 Vaishak V Nair
