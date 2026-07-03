# Product Roadmap

This is the living roadmap for Backspace. Our goal is to make AI-assisted coding completely trustworthy by building the ultimate local-first safety net.

## ✅ Completed (V1 Core)
- [x] Core CLI commands (`init`, `watch`, `stop`, `status`)
- [x] Session-based file tracking and chronological event streaming
- [x] Instant atomic revert capabilities (`revert`, `revert --latest`)
- [x] AES-256-GCM encryption with local key generation
- [x] Built-in Model Context Protocol (MCP) server
- [x] Passive prompt sniffing for major AI tools (Claude Code, Cursor)

## 🚧 Current Focus
- [ ] **AI Flight Recorder**: Complete session forensics. A web-based local dashboard (running on a local port) to visualize exact diffs and AI decisions.
- [ ] **Smart Rollback**: Automatic risk detection. Revert only the risky portions of a session instead of the entire session.
- [ ] **Enhanced Prompt Sniffing**: Broaden support for IDE-based agents like Aider and GitHub Copilot.

## 🔮 Future Vision
- [ ] **Session Replay**: Step-by-step playback of an AI's coding session to understand its logic flow.
- [ ] **AI Blame**: Line-level attribution (`git blame` style) to show exactly which lines were written by a human vs. an AI agent.
- [ ] **VS Code Extension**: Bring the power of the Backspace CLI directly into the IDE with visual diffs and 1-click revert buttons.
- [ ] **Plugin Ecosystem**: Allow the community to build custom sniffers, risk analyzers, and export integrations.
