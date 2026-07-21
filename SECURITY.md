# Security Policy

Backspace is a local-first tool: the daemon watches your filesystem, captures diffs of your code (which may include sensitive material), and stores them AES-256-GCM encrypted in `.backspace/local.db` with a locally generated key. Nothing is transmitted anywhere.

That makes two things security-relevant:

1. **What gets captured** — the ignore engine excludes `.gitignore`d paths, `.env*` files, binaries, and oversized files. If you find a path where secrets can still land in the database, that's a vulnerability.
2. **How it's stored** — the encryption key lives in `.backspace/crypto.key` (file-permission protected, git-ignored). Weaknesses in the key handling, encryption pipeline, or revert path (e.g. writing outside the project root) are vulnerabilities.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Use [GitHub private vulnerability reporting](https://github.com/vaishak-v-nair/Backspace/security/advisories/new), or
- Email the maintainer: vaishak.v.nair.dev@gmail.com

Include reproduction steps and the affected version (`backspace-ai --version`). You'll get an acknowledgment within 72 hours. Fixes for confirmed issues in the latest minor release are prioritized ahead of all feature work.

## Supported versions

| Version | Supported |
|---------|-----------|
| latest 0.x release | ✅ |
| older releases | ❌ — upgrade to latest |
