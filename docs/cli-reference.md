# CLI Reference

The Backspace CLI (`backspace-ai`) provides a minimal, powerful set of commands to manage your AI sessions.

## Core Commands

### `backspace-ai init`
Initializes Backspace in the current directory. Creates the `.backspace/` folder and the local SQLite database. This is a one-time setup per project.

### `backspace-ai watch`
Starts the background file watcher daemon. This monitors your filesystem for changes, hashes them, and records them in real-time as deterministic events. Run this before you start an AI coding session.

### `backspace-ai stop`
Stops the background daemon and formally closes the active session.

### `backspace-ai revert`
The flagship command. Opens an interactive session picker. Selecting a session will instantly reverse every file change that occurred during that session, restoring your project to safety.
- `--latest`: Skips the interactive picker and reverts the most recent session instantly.
- `--id <id>`: Reverts a specific session by its ID.

## Auditing Commands

### `backspace-ai status`
Displays the current status of the Backspace daemon, the database size, and information about the currently active session.

### `backspace-ai log`
Lists all recorded sessions (and legacy snapshots) in a tabular format, including the session ID, timestamp, number of events, and the prompt used.

### `backspace-ai timeline`
Provides a chronological view of all AI activity across all sessions.
- `--file <path>`: Filters the timeline to show only activity affecting a specific file.

### `backspace-ai show <id>`
Pretty-prints the diffs and file changes for a specific session or snapshot.

### `backspace-ai inspect <id>`
Shows deep provenance for a single event, including the exact file, event type, timestamp, detected AI tool, prompt, hashes, and the full diff payload.

## Integration & Advanced Commands

### `backspace-ai mcp`
Starts the Model Context Protocol (MCP) server. This allows supported AI agents to directly interact with Backspace, query history, and trigger rollbacks automatically.

### `backspace-ai integrate <tool>`
Auto-configures integration for specific AI tools.
- Example: `backspace-ai integrate claude` will inject the Backspace MCP server configuration into your local Claude Code settings.

### `backspace-ai check <prompt>`
Analyzes a prompt for risky patterns before starting an AI session.

### `backspace-ai telemetry`
Configure anonymous, local-only transparency flags. (Note: Backspace V1 sends absolutely zero data off your machine).
