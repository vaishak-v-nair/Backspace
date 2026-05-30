# AGENTS.md — Backspace

## What This Project Is

Backspace is a **local-first, deterministic rollback CLI** for AI-assisted development.
When an AI coding tool (Claude Code, Cursor, Copilot, Aider) modifies files, Backspace
captures every change as a diff against the previous state, stores it in a local
SQLite database, and lets the developer revert an entire AI session with one command.

The product has two independent packages in an npm workspace monorepo:

- `packages/cli` — the Node.js/TypeScript CLI + background daemon
- `apps/web`     — the Next.js 15 marketing and dashboard web app

Nothing is shared at runtime between them. They are built, tested, and deployed
independently.

---

## Repository Layout

```
backspace/
├── package.json              ← npm workspaces root
├── tsconfig.base.json        ← shared TS base (ES2022, strict, ESM)
├── .gitignore
├── packages/
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts      ← commander entrypoint, binary: backspace-ai
│           ├── daemon.ts     ← chokidar watcher + diff pipeline
│           ├── db.ts         ← better-sqlite3 schema + prepared statements
│           ├── snapshot.ts   ← file hashing + before/after capture
│           ├── diff.ts       ← unified diff generation using `diff` package
│           └── rollback.ts   ← patch-reversal engine
└── apps/
    └── web/
        ├── package.json
        ├── next.config.ts
        ├── tailwind.config.ts
        └── src/
            └── app/
                ├── layout.tsx
                ├── page.tsx          ← landing page
                ├── pricing/page.tsx
                ├── api/auth/token/route.ts
                └── components/
                    ├── Terminal.tsx
                    ├── DiffBlock.tsx
                    ├── PricingCard.tsx
                    ├── FeatureCard.tsx
                    ├── Navbar.tsx
                    └── Footer.tsx
```

---

## CLI — Complete Specification

### Binary name
`backspace-ai` (invoked as `npx backspace-ai` or globally as `backspace-ai`)

### SQLite Schema (do not change column names or types)

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  prompt      TEXT NOT NULL,
  started_at  INTEGER NOT NULL,   -- unix ms
  ended_at    INTEGER,
  status      TEXT DEFAULT 'active' CHECK(status IN ('active','stopped'))
);

CREATE TABLE IF NOT EXISTS snapshots (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES sessions(id),
  file_path    TEXT NOT NULL,
  event_type   TEXT NOT NULL CHECK(event_type IN ('add','change','unlink')),
  before_hash  TEXT,
  after_hash   TEXT,
  before_text  TEXT,
  after_text   TEXT,
  unified_diff TEXT,
  captured_at  INTEGER NOT NULL
);
```

Database file lives at `{CWD}/.backspace/local.db`. Create directory if missing.

### CLI Commands

| Command | Alias | Description |
|---|---|---|
| `backspace-ai init` | — | Create `.backspace/local.db`, print confirmation |
| `backspace-ai watch` | — | Start daemon (chokidar), opens new session, prompts for label |
| `backspace-ai stop` | — | Stops daemon, marks session ended_at |
| `backspace-ai log` | — | Table of all sessions: id, prompt, started_at, status, file count |
| `backspace-ai show <id>` | — | Pretty-print all diffs for a session |
| `backspace-ai revert <id>` | — | Reverse all changes atomically |
| `backspace-ai status` | — | Show currently active session or "No active session" |

### Daemon Rules (daemon.ts)

- Use `chokidar.watch('.', { ignored: [/\.git/, /node_modules/, /\.backspace/], persistent: true })`
- On `add`: before_text = '', after_text = read file, unified_diff = diff('', after_text)
- On `change`: before_text = last snapshot's after_text for that path (or '' if first), read new content, compute diff
- On `unlink`: before_text = last snapshot's after_text, after_text = null, unified_diff = null
- Write one snapshot row per event, never batch events
- Daemon runs as a child process forked by `watch`; PID stored in `.backspace/daemon.pid`

### Rollback Rules (rollback.ts)

Process all snapshots for a session in **reverse chronological order** (DESC captured_at):

- event_type = 'change' → `fs.writeFileSync(file_path, before_text)`
- event_type = 'add'    → `fs.unlinkSync(file_path)` (file was added by AI, so delete it)
- event_type = 'unlink' → `fs.mkdirSync(dirname, {recursive:true}); fs.writeFileSync(file_path, before_text)`

After all writes succeed, print summary: "✓ N files reverted in Xms"
If any write fails, print the error and stop — do NOT continue partial rollback.

### Dependencies

```json
{
  "dependencies": {
    "commander": "^12",
    "chokidar": "^3",
    "better-sqlite3": "^9",
    "diff": "^5",
    "chalk": "^5",
    "ora": "^8",
    "nanoid": "^5"
  },
  "devDependencies": {
    "@types/better-sqlite3": "*",
    "@types/diff": "*",
    "@types/node": "*",
    "tsup": "^8",
    "typescript": "^5"
  }
}
```

Build with tsup: `tsup src/index.ts --format esm,cjs --dts`
Output to `dist/`. The `bin` field in package.json: `"backspace-ai": "./dist/index.js"`

---

## Web App — Complete Specification

### Design System (do not deviate)

| Token | Value |
|---|---|
| Background | `#0a0a0a` |
| Surface | `#111111` |
| Border | `#222222` |
| Accent primary | `#7c3aed` (electric violet) |
| Accent secondary | `#06b6d4` (neon cyan) |
| Text primary | `#f8fafc` |
| Text muted | `#64748b` |
| Code font | JetBrains Mono |
| UI font | Inter |

Apply glassmorphism to feature cards: `backdrop-blur-md bg-white/5 border border-white/10`
Subtle dot-grid background on hero: CSS radial-gradient pattern.

### Pages

#### `/` (page.tsx)
Sections in order:
1. Navbar — logo left, nav links center, GitHub + CTA right
2. Hero — headline, subheadline, terminal animation, CTA buttons
3. Problem — stats block (use REAL numbers — see Data Rules below)
4. Features — 6 cards grid
5. How It Works — 3-step numbered flow (init → watch → revert)
6. Token Calculator — slider-based interactive component
7. Waitlist / CTA — email input form
8. Footer

#### `/pricing` (pricing/page.tsx)
Three tiers: Free / Pro ($9/mo) / Team ($29/mo)
Tier comparison table beneath the cards.
FAQ accordion with at least 5 questions.

#### `GET /api/auth/token` (route.ts)
```typescript
// Request body: { email: string; plan: 'free' | 'pro' | 'team' }
// Response: { token: string; expiresAt: string }
// Use jose to sign JWT: sub=email, plan, iat, exp=30d
// In-memory rate limit: max 5 requests per email per hour
// Return 429 if rate limit exceeded
// Return 400 if email or plan is missing/invalid
```

---

## Data Rules — No Fake Statistics

**NEVER invent numbers.** Every statistic displayed on the website must come from one of:

1. A real session generated by running `backspace-ai watch` on the Backspace monorepo itself
2. A documented test fixture in `packages/cli/test/fixtures/`
3. A calculation with a clearly commented formula in the component

The token calculator formula must be:
```
tokensPerFile = 3000          // avg lines × avg tokens per line
debugIterations = 3           // conservative, documented assumption
tokensSaved = files × tokensPerFile × debugIterations
moneySaved = (tokensSaved / 1_000_000) × 3.00  // Claude Sonnet input rate
timeSaved = files × 1.5       // minutes, documented assumption
```
Comment every magic number. If assumptions change, update the comment.

---

## Known Issues to Fix (Priority Order)

1. **Waitlist vs Available contradiction** — The hero shows `npx backspace-ai init`
   AND a "Join Waitlist" CTA. Pick one. If CLI works: remove waitlist from hero,
   change CTA to "Install Now → npm install -g backspace-ai". If not ready: remove
   the install command from the hero entirely.

2. **Waitlist form has no backend** — Wire the email form to a real persistence layer.
   Minimum viable: POST to `/api/waitlist` → append to a Supabase `waitlist` table →
   send a confirmation email via Resend. Return 200 with `{ success: true }`.

3. **MCP feature claim** — The feature card says "MCP Native" but no MCP server exists.
   Either: (a) build a minimal MCP server at `packages/mcp/` exposing
   `list_sessions`, `get_snapshot_diff`, `revert_session` tools, OR (b) remove the
   feature card until it is built.

4. **AES-256 feature claim** — Same problem. Either use SQLCipher / a node crypto
   wrapper to encrypt snapshot text columns, or remove the encryption claim.

5. **Command name mismatch** — The original spec used `backspace start` / `backspace rollback`.
   The website uses `backspace watch` / `backspace revert`. The CLI source may use yet
   another set. Audit `src/index.ts`, reconcile with what's on the website, and make
   them match everywhere: code, README, website, and this file.

---

## Coding Standards

- **TypeScript strict mode everywhere** — no `any`, no `@ts-ignore` without comment
- **ESM** — use `import/export`, not `require`
- **Async in the web layer, sync in the CLI** — better-sqlite3 is synchronous by design; embrace it
- **No external runtime dependencies in the web app beyond Next.js and jose** — no Prisma, no heavy ORMs for the token endpoint
- **Error messages must be actionable** — "Session not found" is wrong; "Session abc123 not found. Run `backspace-ai log` to see valid IDs." is right
- **No `console.log` in production paths** — use chalk for CLI output, structured for daemon

---

## Testing

Before marking any task complete, verify:

### CLI
```bash
cd packages/cli
npm run build                              # zero TypeScript errors
node dist/index.js init                    # creates .backspace/local.db
node dist/index.js watch                   # starts daemon, creates session
# (modify a test file)
node dist/index.js status                  # shows active session
node dist/index.js stop                    # marks session ended
node dist/index.js log                     # shows session in table
node dist/index.js show <id>               # shows diffs
node dist/index.js revert <id>             # restores files
# verify the modified test file is back to original content
```

### Web
```bash
cd apps/web
npm run build                              # zero Next.js build errors
npm run dev
# GET /api/auth/token with valid body → 200 + JWT
# GET /api/auth/token with missing body → 400
# GET /api/auth/token 6 times same email → 429 on 6th
# All pages render without hydration errors
# No hardcoded fake statistics in page.tsx
```

---

## What the Agent Must Never Do

- Do not invent placeholder data (fake session IDs, fake file counts, fake timestamps)
- Do not add npm packages not listed in the Dependencies section without asking
- Do not change the SQLite schema column names or types
- Do not rename CLI commands without updating the website and README simultaneously
- Do not add features not in this spec without confirming — especially do not add
  a "cloud sync" or "team collaboration" feature that requires external infrastructure
- Do not leave TODO comments — either implement the thing or remove the reference
- Do not stub functions that silently succeed — throw a descriptive error if a feature
  is not yet implemented

---

## Current Product Status (as of build date)

- CLI: partially implemented — build and basic commands may work, rollback edge cases
  (unlink events, partial sessions) likely untested
- Web: landing page deployed at backspace-three.vercel.app — marketing copy is live
  but contains several unbuilt feature claims and fake statistics
- Waitlist: cosmetic only — no backend, no emails
- MCP integration: not built
- Encryption: not built
- Dashboard: not built (web app is marketing only, no session data from CLI is shown)

Prioritize making what exists actually work before adding new features.
