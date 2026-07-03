# Backspace — Product & Architecture Guide

Backspace is a **local-first, deterministic rollback CLI** designed specifically for AI-assisted software development. 

When you use autonomous AI coding agents (like Claude Code, Cursor, Aider, or Copilot Workspace), they often make sweeping changes across dozens of files. If the AI "hallucinates" or breaks the codebase, `git reset --hard` might destroy unrelated manual work, and manual `CTRL+Z` across 15 files is error-prone. 

Backspace solves this by running a silent background daemon that intercepts, compresses, encrypts, and logs every single file mutation made during an AI session, allowing you to instantly revert the exact state of the codebase to the moment before the AI made a mistake.

---

## 1. High-Level Architecture

Backspace is structured as an NPM workspace monorepo containing two completely independent pieces:

1. **`packages/cli` (The Engine)**: A Node.js CLI and background daemon built with TypeScript, `chokidar` (file watching), and `better-sqlite3` (storage).
2. **`apps/web` (The Showcase)**: A Next.js 15 web application serving as the marketing landing page, designed with a premium, high-end "Caveman" aesthetic.

Nothing is shared at runtime between the CLI and the Web App. They are built and operated independently.

---

## 2. The CLI & Daemon Architecture

The core of Backspace is the `backspace-ai` CLI. Its most critical component is the **Supervisor and Daemon** architecture.

### The Supervisor Process
When you run `backspace-ai watch`, you don't want your terminal locked up. The CLI acts as a "Supervisor". It uses Node's `child_process.spawn` to launch the watcher daemon in a completely detached state, allowing the CLI command to exit immediately while the daemon lives on in the background.

* **PID Tracking**: The supervisor writes the daemon's Process ID (PID) to `.backspace/daemon.pid`.
* **Platform Agnostic**: Handles Windows-specific pathing issues (like `C:\Program Files\...`) to ensure the detached process survives across OS environments.

### The Chokidar Watcher
The detached daemon uses `chokidar` to monitor the current working directory (`cwd`). It ignores `.git`, `node_modules`, and its own `.backspace` directory to prevent infinite loops.

It listens for three specific filesystem events:
1. `add` (File created)
2. `change` (File modified)
3. `unlink` (File deleted)

### The Capture Pipeline
When a file event occurs, the daemon doesn't just save the new file. It computes a precise **Unified Diff**.
- It maintains an in-memory cache of file hashes.
- It reads the `before_text` (if the file existed) and the `after_text`.
- It uses the `diff` library to generate a precise line-by-line unified patch.
- It groups rapid, successive changes together using a debounce mechanism (e.g., an AI writing a file chunk-by-chunk) into a single "batch" snapshot.

---

## 3. The Security & Storage Pipeline

Backspace is rigorously **Local-First**. Your code never leaves your machine. Because it stores raw source code, the storage layer is highly secure and optimized.

### Local Database (SQLite)
Data is written to `{project_root}/.backspace/local.db` using `better-sqlite3`.
- Operates in `WAL` (Write-Ahead Logging) mode to prevent `SQLITE_BUSY` locks when the AI is rapidly writing to dozens of files simultaneously.
- Stores metadata: Timestamp, Snapshot ID, AI Prompt (if sniffed), and an Array of changed file paths.

### The Encryption & Compression Chain
The actual diff payloads are heavily processed before touching the hard drive. Backspace uses a 4-step pipeline:

**Writing to Disk (The Daemon):**
1. **Serialize**: Converts the diff array into a JSON string.
2. **Compress**: Uses `zlib.brotliCompressSync` to vastly shrink the text size.
3. **Encrypt**: Uses hardware-accelerated **AES-256-GCM**.
   - The key is dynamically generated on first run and stored securely in `.backspace/crypto.key` (with read-only `0o400` permissions).
   - Generates an encrypted payload, an Initialization Vector (IV), and an Auth Tag (to prevent tampering).
4. **Store**: Wraps the crypto data in JSON, compresses it one final time, and saves it as a `BLOB` in SQLite.

**Reading from Disk (Show & Revert Commands):**
1. **Query**: Fetch the BLOB from SQLite.
2. **Decrypt**: Provide the IV and Tag to `crypto.createDecipheriv` to retrieve the Base64 string.
3. **Decode & Decompress**: Convert Base64 to Buffer, then run `zlib.brotliDecompressSync`.
4. **Parse**: Parse the resulting string back into the original JSON diff payload.

---

## 4. The Revert Engine

When you run `backspace-ai revert`, the system queries the database, decrypts the chosen snapshot, and applies the reverse operations. It is fully deterministic.

- If the AI triggered a `change`: Backspace applies the reverse unified diff patch. If the patch fails, it gracefully falls back to overwriting the file with the exact `before_text` stored in the snapshot.
- If the AI triggered an `add`: Backspace knows the file didn't exist before, so it issues an `fs.unlinkSync()` to delete the hallucinated file.
- If the AI triggered an `unlink` (deletion): Backspace recursively recreates the directory tree if necessary and writes the `before_text` back to disk, bringing the deleted file back to life.

---

## 5. Command Reference

| Command | Action |
|---|---|
| `backspace-ai init` | Initializes the `.backspace` directory, SQLite DB, and generates the `crypto.key`. |
| `backspace-ai watch` | Spawns the detached background daemon to begin tracking AI modifications. |
| `backspace-ai status` | Checks if the daemon is currently running and reports the database size. |
| `backspace-ai log` | Displays a tabular history of all captured snapshots, file counts, and times. |
| `backspace-ai show <id>` | Decrypts a specific snapshot and prints the exact code diffs to the terminal. |
| `backspace-ai stop` | Gracefully kills the detached daemon process and cleans up the PID file. |
| `backspace-ai revert` | Interactively prompts you to select a snapshot and reverses all changes. |
| `backspace-ai revert --latest` | Automatically bypasses prompts and reverts the very last AI action instantly. |
| `backspace-ai revert --id <id>`| Reverts a specific snapshot by its ID. |

---

## 6. The Web App (Showcase)

The Next.js application (`apps/web`) is a purely marketing and user-acquisition layer. 
- **Aesthetic**: Uses a high-end, premium developer aesthetic inspired by `getcaveman.dev` (warm charcoal, cream text, grain overlays, serif-italic emphasis).
- **Interactivity**: Features a real-time Token Calculator, GSAP scroll animations, and animated Terminal mockups that demonstrate the CLI commands visually.
- **Backend**: Contains a lightweight Supabase integration (`/api/waitlist`) for capturing user interest prior to full public distribution.
