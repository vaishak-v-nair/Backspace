<div align="center">
  
  # ⌫ Backspace
  **The Deterministic Undo Button for AI Vibe Coding.**

  [![Build Status](https://img.shields.io/github/actions/workflow/status/vaishak-v-nair/backspace/main.yml?style=for-the-badge)](https://github.com/vaishak-v-nair/backspace/actions)
  [![Version](https://img.shields.io/npm/v/backspace-ai?style=for-the-badge)](https://www.npmjs.com/package/backspace-ai)
  [![License: MIT](https://img.shields.io/badge/License-MIT-white.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

  [Website](https://backspace.dev) • [Documentation](#quick-start) • [Discord](#community)
</div>

<br/>

## 🛑 Claude broke your build?
Autonomous coding agents (like Claude Code, Cursor, and Aider) are incredibly fast, but their outputs are non-deterministic. When an agent hallucinates, runs a rogue bash script, or destroys a production database schema, standard Git commits are too coarse and slow to recover the lost work.

**Backspace is the OS-level safety net.** It silently captures micro-snapshots of your files before every AI action, pairs the file diff with the exact natural language prompt, and allows you to instantly scrub back in time to the last stable state.

Stop burning API tokens trying to make an AI fix its own mistakes. Just `backspace revert`.

---

## ✨ Features

- **Universal Time Machine:** Agent-agnostic. Catches file changes from Cursor, Windsurf, Aider, Claude Code, or even rogue bash commands.
- **Claude MCP Integration:** Backspace acts as a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server. Claude Code becomes self-aware, reading its own snapshot history to proactively suggest rollbacks instead of looping in errors.
- **Zero-Friction Auto-Connect:** A 60-second, one-click `npx` setup. No manual config files.
- **Local-First, Cloud-Synced:** Powered by a hyper-fast local SQLite database with Write-Ahead Logging (WAL) to handle massive concurrent file refactors, seamlessly synced to Supabase.
- **Visual Timeline Slider:** Don't just read terminal logs. Drag a slider in your IDE to watch your codebase physically rewrite itself in real-time.

---

## 🚀 Quick Start

You don't need to configure environment variables or mess with local proxies. Backspace uses an auto-discovery engine.

**1. Install & Authenticate**
```bash
npx backspace-ai login

```

*This opens your browser to securely authenticate via Clerk and initializes your local `.backspace` engine.*

**2. Protect Your Project**
Navigate to any repository you want to protect and initialize the daemon:

```bash
cd your-project
backspace watch

```

**3. Integrate Claude Code (Optional but Recommended)**
Give Claude Code a "prefrontal cortex" by injecting the Backspace MCP server:

```bash
backspace integrate claude

```

---

## 🛠️ Usage

When an AI hallucination destroys your code, simply run:

```bash
backspace revert

```

Backspace will present a visual diff of the last 5 AI actions and their prompts. Select the stable state, and your files are instantly restored.

---

## 🏗️ Monorepo Architecture

This project is structured as a scalable monorepo using npm workspaces:

```text
/
├── apps/
│   └── web/            # Next.js 15 Landing Page (Cluma-aesthetic, React Three Fiber, Lenis)
├── packages/
│   └── cli/            # The core Node.js daemon, SQLite diff engine, and MCP server
├── supabase/           # PostgreSQL Row-Level Security policies & edge functions
└── .github/workflows/  # Automated CI/CD and npm provenance signing

```

---

## 🔒 Security Posture

Backspace handles proprietary code, which requires absolute security:

* **Zero-Trust Auth:** Managed by Clerk with mandatory short-lived JWTs.
* **Row-Level Security (RLS):** Supabase DB ensures tenant isolation at the database level.
* **Safe Sandboxing:** Telemetry is completely anonymous and strictly strips all file names, paths, and code snippets before transmission.

---

## 🤝 Contributing

We welcome contributions from the community. Please read our [Contributing Guidelines](https://www.google.com/search?q=CONTRIBUTING.md) before submitting a Pull Request.

**Local Development Setup:**

```bash
git clone https://github.com/vaishak-v-nair/backspace.git
cd backspace
npm install
npm run build --workspaces

```

## 📄 License

MIT License © 2026 Vaishak V Nair
