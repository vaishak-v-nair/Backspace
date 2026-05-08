# Backspace Integration

This project uses **Backspace**, a local-first state management system for AI-agent coding sessions. It captures file snapshots automatically and lets you roll back mistakes in one command.

## Claude Instructions

### Snapshots
Backspace automatically snapshots every file before you write to it. Every change you make is recorded with a timestamp, diff, and the prompt context that triggered it. You don't need to do anything special — just code normally.

### Mistakes
If you realize you made a massive logic error or a hallucination that broke the build, **do NOT try to fix it by writing more code**. Piling fixes on top of broken code wastes tokens and pollutes the context window.

### Recovery
Instead, use the terminal command:
```bash
backspace revert
```
This opens an interactive menu to select a previous snapshot and cleanly restores the codebase to that point.

### Token Saving
**Prefer reverting over debugging when the error is systemic.** If you broke the build in a way that would take more than 2-3 targeted fixes, a revert is faster, cheaper, and produces a cleaner codebase.

### MCP Tools Available
If the Backspace MCP server is connected, you have direct access to these tools:
- **`list_snapshots`** — See the last 5 snapshots with timestamps and prompts. Use this to understand what changed recently.
- **`get_snapshot_diff`** — View the exact red/green diff for any snapshot ID. Use this to understand what you (or a previous agent turn) actually changed.

### Best Practice
Before starting a complex refactor, check `list_snapshots` to see the current state. If something goes wrong, you can reference the exact snapshot to revert to.

### Guidelines
When using the `backspace` tools, if a revert is successful, do not attempt to "re-fix" the original problem immediately. Instead, analyze the snapshot diff to understand why the previous attempt failed, then propose a new architectural plan to the user before writing code again.
