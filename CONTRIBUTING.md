# Contributing to Backspace

Thank you for your interest in contributing to Backspace! This document provides guidelines and steps for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Getting Started

Backspace is an npm workspace monorepo with two main packages:

| Package | Path | Description |
|---------|------|-------------|
| **CLI** | `packages/cli/` | Core Node.js daemon and CLI tool |
| **Web** | `apps/web/` | Next.js marketing website |

### Prerequisites

- **Node.js** ≥ 22.5.0
- **npm** ≥ 10.0.0
- **Git**

---

## Development Setup

```bash
# 1. Fork the repo on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Backspace.git
cd Backspace

# 3. Install all dependencies (npm workspaces)
npm install

# 4. Build the CLI
cd packages/cli
npm run build

# 5. Test your build
node dist/index.js --help
```

### Running the Web App Locally

```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```

### Running the CLI in Development Mode

```bash
cd packages/cli
npm run dev
# This uses tsx watch for hot-reloading
```

---

## How to Contribute

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/vaishak-v-nair/Backspace/labels/good%20first%20issue). These are specifically designed for new contributors:

- Adding support for new AI tool prompt detection
- Improving terminal output formatting
- Adding export formats (HTML, Markdown)
- Documentation improvements
- Adding language-specific risk patterns

### Areas We Need Help

- **AI Tool Sniffers**: Add prompt detection for Windsurf, Continue.dev, Cody, etc.
- **Risk Patterns**: Language-specific patterns for Python, Rust, Go, Java
- **Platform Testing**: Windows-specific edge cases, Linux compatibility
- **Documentation**: Tutorials, examples, translations
- **Selective Revert**: `--file` / `--hunk` flags for surgical rollback (see roadmap)

---

## Adding a New AI Sniffer

Backspace captures prompt context by **passively tailing the log/history files** that AI tools write to disk (`packages/cli/src/sniffer.ts`) — no proxying, no SSL interception. Each tool is a `LogSource` with three methods: `detect()` (are this tool's files present?), `tail()` (watch them for changes), and `stop()`.

To add a new tool:

1. **Find where the tool logs conversations** — e.g. Aider writes `.aider.chat.history.md` in the project root; Cursor keeps workspace state under its app-data directory.
2. **Write a factory** following the existing pattern:
   ```typescript
   function createCodeGeniusSource(cwd: string): LogSource {
     const historyPath = path.join(cwd, '.codegenius', 'history.jsonl');
     let watcher: FSWatcher | null = null;
     return {
       name: 'CodeGenius',
       detect: () => fs.existsSync(historyPath),
       tail() {
         watcher = chokidar.watch(historyPath, { persistent: false });
         watcher.on('change', () => {
           const prompt = /* parse the newest user prompt from the file */;
           if (prompt) setPrompt(prompt, 'CodeGenius');
         });
       },
       stop() { watcher?.close(); },
     };
   }
   ```
3. **Register it** in the `sources` array inside `startSniffer()`.
4. **Test it**: run `backspace-ai watch`, use the tool, then check `backspace-ai log` — new sessions/events should carry the sniffed prompt instead of `System: Auto-captured batch change`.

---

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Branch Naming Convention

| Prefix | Use for |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Adding or updating tests |
| `chore/` | Build/tooling changes |

### 2. Make Your Changes

- Write clean, TypeScript-strict code
- Follow the [Coding Standards](#coding-standards) below
- Add comments explaining *why*, not *what*

### 3. Test Your Changes

```bash
# CLI: type-check, build, and end-to-end smoke test must pass
cd packages/cli
npx tsc --noEmit
npm run build
npm run smoke   # proves init → watch → edit → stop → revert restores files

# Web: Build must pass
cd apps/web
npm run build
```

### 4. Submit Your PR

- Fill out the PR template completely
- Reference any related issues
- Include a clear description of what changed and why
- Add screenshots for UI changes

### 5. Review Process

- A maintainer will review your PR within 48 hours
- Address any feedback through additional commits
- Once approved, your PR will be merged

---

## Coding Standards

### TypeScript

- **Strict mode everywhere** — no `any`, no `@ts-ignore` without a comment explaining why
- **ESM** — use `import/export`, not `require`
- **Async in the web layer, sync in the CLI** — `better-sqlite3` is synchronous by design

### Error Messages

Error messages must be **actionable**:

```typescript
// ❌ Bad
throw new Error("Session not found");

// ✅ Good
throw new Error(
  `Session ${id} not found. Run \`backspace-ai log\` to see valid session IDs.`
);
```

### Output

- No `console.log` in production paths — use `chalk` for CLI output
- Use `ora` for spinners on long-running operations
- Match the existing terminal output style (see any command handler for examples)

### File Structure

- One exported function per file when possible
- Commands go in `packages/cli/src/commands/`
- Shared utilities go in the appropriate module (`db.ts`, `crypto.ts`, etc.)

---

## Reporting Bugs

Use the [Bug Report template](https://github.com/vaishak-v-nair/Backspace/issues/new?template=bug_report.yml) and include:

1. **Node.js version** (`node --version`)
2. **OS** (Windows/macOS/Linux + version)
3. **Backspace version** (`backspace-ai --version`)
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **Error output** (if any)

---

## Suggesting Features

Use the [Feature Request template](https://github.com/vaishak-v-nair/Backspace/issues/new?template=feature_request.yml). Good feature requests include:

1. **Problem statement** — What problem does this solve?
2. **Proposed solution** — How would it work?
3. **Alternatives considered** — What else did you think about?
4. **Use case** — When would a developer use this daily?

---

## Questions?

Open a [Discussion](https://github.com/vaishak-v-nair/Backspace/discussions) for general questions, ideas, or conversations about the project direction.

---

Thank you for contributing to Backspace! 🎉
