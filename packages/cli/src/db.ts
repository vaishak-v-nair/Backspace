/**
 * db.ts — Unified Backspace database layer
 *
 * Single entry point for all SQLite operations. Replaces the previous split
 * between standalone functions and the LocalDB class with one typed API.
 *
 * The database lives at `{CWD}/.backspace/local.db` and uses WAL mode
 * for concurrent writes during rapid AI mutations.
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

// ── Constants ─────────────────────────────────────────────────────────────────

export const BACKSPACE_DIR = '.backspace';
export const DB_FILENAME = 'local.db';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape of a snapshot row as returned by list/get queries (legacy format). */
export interface SnapshotRow {
  id: string;
  timestamp: Date;
  prompt_context: string;
  file_paths: string[];
}

/** Shape of a snapshot row with its diff payload included. */
export interface SnapshotDetail extends SnapshotRow {
  /** Parsed diff data — either an array of payloads or an encrypted envelope. */
  diff_data: unknown;
}

/** Input for batch-inserting snapshots (legacy daemon format). */
export interface SnapshotPayload {
  prompt: string;
  files_changed: string; // JSON-encoded string[]
  diff_payload: string;  // JSON-encoded diff data
}

// ── Session types ─────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'stopped' | 'reverted';

/** Shape of a session row as returned by list queries. */
export interface SessionRow {
  id: string;
  prompt: string;
  tool: string | null;
  started_at: number;     // unix ms
  ended_at: number | null;
  status: SessionStatus;
  event_count: number;
}

// ── Event types ───────────────────────────────────────────────────────────────

export type EventType = 'add' | 'change' | 'unlink';

/** Shape of an event row as returned by queries. */
export interface EventRow {
  id: string;
  session_id: string;
  file_path: string;
  event_type: EventType;
  tool: string | null;
  prompt: string | null;
  before_hash: string | null;
  after_hash: string | null;
  diff_payload: Buffer | null;
  captured_at: number;      // unix ms
  sequence: number;
}

/** Input for inserting a new event. */
export interface EventInsert {
  id: string;
  session_id: string;
  file_path: string;
  event_type: EventType;
  tool?: string | null;
  prompt?: string | null;
  before_hash?: string | null;
  after_hash?: string | null;
  diff_payload: Buffer | null;
  captured_at: number;
  sequence: number;
}

// ── Path helpers ──────────────────────────────────────────────────────────────

export function getBackspaceDir(cwd: string): string {
  return path.join(cwd, BACKSPACE_DIR);
}

export function getDbPath(cwd: string): string {
  return path.join(getBackspaceDir(cwd), DB_FILENAME);
}

export function isInitialized(cwd: string): boolean {
  return fs.existsSync(getDbPath(cwd));
}

// ── BackspaceDB ───────────────────────────────────────────────────────────────

/**
 * Unified database class for the Backspace CLI.
 *
 * Usage:
 *   const db = BackspaceDB.open(process.cwd());
 *   const snapshots = db.listSnapshots();
 *   db.close();
 */
export class BackspaceDB {
  private db: Database.Database;
  readonly cwd: string;

  private constructor(db: Database.Database, cwd: string) {
    this.db = db;
    this.cwd = cwd;
  }

  /**
   * Opens (or creates) the Backspace database for the given project root.
   * Creates the `.backspace/` directory if it doesn't exist.
   */
  static open(cwd: string): BackspaceDB {
    const dbPath = getDbPath(cwd);
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const db = new Database(dbPath);

    // CRITICAL: Prevent SQLITE_BUSY locks during massive concurrent AI refactors
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 5000');

    const instance = new BackspaceDB(db, cwd);
    instance.initSchema();
    return instance;
  }

  /** Closes the database connection. */
  close(): void {
    this.db.close();
  }

  /** Returns the raw better-sqlite3 handle for advanced operations. */
  get handle(): Database.Database {
    return this.db;
  }

  // ── Schema ────────────────────────────────────────────────────────────────

  private initSchema(): void {
    // Legacy snapshots table — preserved for backward compatibility.
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        prompt TEXT,
        files_changed TEXT,
        diff_payload BLOB
      );
    `);

    // Sessions: the watch lifecycle (implements AGENTS.md sessions spec)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        prompt      TEXT NOT NULL,
        tool        TEXT,
        started_at  INTEGER NOT NULL,
        ended_at    INTEGER,
        status      TEXT NOT NULL DEFAULT 'active'
                      CHECK(status IN ('active','stopped','reverted')),
        event_count INTEGER NOT NULL DEFAULT 0,
        metadata    TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_status
        ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_started
        ON sessions(started_at DESC);
    `);

    // Events: individual file mutations (the provenance chain)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id           TEXT PRIMARY KEY,
        session_id   TEXT NOT NULL REFERENCES sessions(id),
        file_path    TEXT NOT NULL,
        event_type   TEXT NOT NULL CHECK(event_type IN ('add','change','unlink')),
        tool         TEXT,
        prompt       TEXT,
        before_hash  TEXT,
        after_hash   TEXT,
        diff_payload BLOB,
        captured_at  INTEGER NOT NULL,
        sequence     INTEGER NOT NULL,
        metadata     TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_events_session
        ON events(session_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_events_file
        ON events(file_path, captured_at);
      CREATE INDEX IF NOT EXISTS idx_events_captured
        ON events(captured_at);
    `);
  }

  // ── Session CRUD ──────────────────────────────────────────────────────────

  /** Creates a new active session. Returns the session ID. */
  createSession(id: string, prompt: string, tool?: string | null): string {
    const stmt = this.db.prepare(
      'INSERT INTO sessions (id, prompt, tool, started_at, status, event_count) VALUES (?, ?, ?, ?, ?, ?)',
    );
    stmt.run(id, prompt, tool ?? null, Date.now(), 'active', 0);
    return id;
  }

  /** Marks a session as stopped with the current timestamp. */
  stopSession(id: string): void {
    const stmt = this.db.prepare(
      'UPDATE sessions SET status = ?, ended_at = ? WHERE id = ? AND status = ?',
    );
    stmt.run('stopped', Date.now(), id, 'active');
  }

  /** Marks a session as reverted. */
  revertSession(id: string): void {
    const stmt = this.db.prepare(
      'UPDATE sessions SET status = ? WHERE id = ?',
    );
    stmt.run('reverted', id);
  }

  /** Returns the currently active session, or null if none. */
  getActiveSession(): SessionRow | null {
    const stmt = this.db.prepare(
      'SELECT * FROM sessions WHERE status = ? ORDER BY started_at DESC LIMIT 1',
    );
    const row = stmt.get('active') as SessionRow | undefined;
    return row ?? null;
  }

  /** Fetches a session by exact ID. */
  getSession(id: string): SessionRow | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(id) as SessionRow | undefined;
    return row ?? null;
  }

  /** Fetches a session by exact or prefix ID match. */
  findSession(idOrPrefix: string): SessionRow | null {
    const exact = this.getSession(idOrPrefix);
    if (exact) return exact;

    if (idOrPrefix.length < 36) {
      const all = this.listSessions();
      const match = all.find((s) => s.id.startsWith(idOrPrefix));
      if (match) return this.getSession(match.id);
    }

    return null;
  }

  /** Lists all sessions ordered by started_at descending. */
  listSessions(limit?: number): SessionRow[] {
    const sql = limit !== undefined
      ? 'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?'
      : 'SELECT * FROM sessions ORDER BY started_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = (limit !== undefined ? stmt.all(limit) : stmt.all()) as SessionRow[];
    return rows;
  }

  /** Increments the event count for a session. */
  incrementSessionEventCount(sessionId: string): void {
    const stmt = this.db.prepare(
      'UPDATE sessions SET event_count = event_count + 1 WHERE id = ?',
    );
    stmt.run(sessionId);
  }

  // ── Event CRUD ────────────────────────────────────────────────────────────

  /** Inserts a single event row. */
  insertEvent(event: EventInsert): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (id, session_id, file_path, event_type, tool, prompt, before_hash, after_hash, diff_payload, captured_at, sequence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.session_id,
      event.file_path,
      event.event_type,
      event.tool ?? null,
      event.prompt ?? null,
      event.before_hash ?? null,
      event.after_hash ?? null,
      event.diff_payload,
      event.captured_at,
      event.sequence,
    );
  }

  /** Lists all events for a session, ordered by sequence ASC. */
  listSessionEvents(sessionId: string): EventRow[] {
    const stmt = this.db.prepare(
      'SELECT * FROM events WHERE session_id = ? ORDER BY sequence ASC',
    );
    return stmt.all(sessionId) as EventRow[];
  }

  /** Lists all events for a session in reverse order (for rollback). */
  listSessionEventsReverse(sessionId: string): EventRow[] {
    const stmt = this.db.prepare(
      'SELECT * FROM events WHERE session_id = ? ORDER BY sequence DESC',
    );
    return stmt.all(sessionId) as EventRow[];
  }

  /** Fetches a single event by ID. */
  getEvent(id: string): EventRow | null {
    const stmt = this.db.prepare('SELECT * FROM events WHERE id = ?');
    const row = stmt.get(id) as EventRow | undefined;
    return row ?? null;
  }

  /** Gets the next sequence number for a session. */
  getNextSequence(sessionId: string): number {
    const stmt = this.db.prepare(
      'SELECT MAX(sequence) AS max_seq FROM events WHERE session_id = ?',
    );
    const row = stmt.get(sessionId) as { max_seq: number | null } | undefined;
    return (row?.max_seq ?? -1) + 1;
  }

  /** Lists all events for a specific file path across all sessions. */
  listFileEvents(filePath: string, limit?: number): EventRow[] {
    const sql = limit !== undefined
      ? 'SELECT * FROM events WHERE file_path = ? ORDER BY captured_at DESC LIMIT ?'
      : 'SELECT * FROM events WHERE file_path = ? ORDER BY captured_at DESC';

    const stmt = this.db.prepare(sql);
    return (limit !== undefined ? stmt.all(filePath, limit) : stmt.all(filePath)) as EventRow[];
  }

  // ── Snapshot reads (legacy) ───────────────────────────────────────────────

  /** Lists all snapshots ordered by timestamp descending. */
  listSnapshots(limit?: number): SnapshotRow[] {
    const sql = limit !== undefined
      ? 'SELECT id, timestamp, prompt AS prompt_context, files_changed AS file_paths FROM snapshots ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT id, timestamp, prompt AS prompt_context, files_changed AS file_paths FROM snapshots ORDER BY timestamp DESC';

    const stmt = this.db.prepare(sql);

    const rows = (limit !== undefined ? stmt.all(limit) : stmt.all()) as Array<{
      id: string;
      timestamp: string;
      prompt_context: string;
      file_paths: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      timestamp: new Date(r.timestamp),
      prompt_context: r.prompt_context ?? 'Auto-capture',
      file_paths: this.safeParseJSON<string[]>(r.file_paths, []),
    }));
  }

  /** Fetches a single snapshot by exact ID, including diff payload. */
  getSnapshot(id: string): SnapshotDetail | null {
    const stmt = this.db.prepare(
      'SELECT id, timestamp, prompt AS prompt_context, files_changed AS file_paths, diff_payload AS diff_data FROM snapshots WHERE id = ?',
    );

    const row = stmt.get(id) as {
      id: string;
      timestamp: string;
      prompt_context: string;
      file_paths: string;
      diff_data: Buffer | string | null;
    } | undefined;

    if (!row) return null;

    let parsedDiffData: unknown = {};
    if (row.diff_data) {
      const decompressed = this.decompressBlobSafe(row.diff_data);
      parsedDiffData = this.safeParseJSON(decompressed, {});
    }

    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      prompt_context: row.prompt_context ?? 'Auto-capture',
      file_paths: this.safeParseJSON<string[]>(row.file_paths, []),
      diff_data: parsedDiffData,
    };
  }

  /**
   * Fetches a snapshot by exact or prefix ID match.
   * Tries exact match first, then prefix search for short IDs.
   */
  findSnapshot(idOrPrefix: string): SnapshotDetail | null {
    // Try exact match first
    const exact = this.getSnapshot(idOrPrefix);
    if (exact) return exact;

    // Prefix match for short IDs
    if (idOrPrefix.length < 36) {
      const all = this.listSnapshots();
      const match = all.find((s) => s.id.startsWith(idOrPrefix));
      if (match) return this.getSnapshot(match.id);
    }

    return null;
  }

  // ── Snapshot writes (legacy) ──────────────────────────────────────────────

  /**
   * Inserts a single snapshot with brotli-compressed diff payload.
   * Used by the daemon to persist captured changes.
   */
  saveSnapshot(
    id: string,
    diffText: string,
    filesChanged: string = '[]',
    prompt: string = 'Auto-capture',
  ): void {
    const compressedPayload = zlib.brotliCompressSync(Buffer.from(diffText, 'utf8'));
    const stmt = this.db.prepare(
      'INSERT INTO snapshots (id, prompt, files_changed, diff_payload) VALUES (?, ?, ?, ?)',
    );
    stmt.run(id, prompt, filesChanged, compressedPayload);
  }

  /**
   * Batch-inserts multiple snapshots in a single transaction.
   * Each payload's diff_payload is brotli-compressed before storage.
   */
  batchInsertSnapshots(snapshots: SnapshotPayload[]): void {
    const insert = this.db.prepare(
      'INSERT INTO snapshots (id, prompt, files_changed, diff_payload) VALUES (?, ?, ?, ?)',
    );

    const insertMany = this.db.transaction((items: SnapshotPayload[]) => {
      for (const item of items) {
        const id = crypto.randomUUID();
        const compressedPayload = zlib.brotliCompressSync(
          Buffer.from(item.diff_payload, 'utf8'),
        );
        insert.run(id, item.prompt, item.files_changed, compressedPayload);
      }
    });

    insertMany(snapshots);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Safely decompresses a BLOB that may or may not be brotli-compressed.
   * Falls back to raw string conversion if decompression fails.
   */
  private decompressBlobSafe(data: Buffer | string): string {
    if (typeof data === 'string') return data;

    try {
      return zlib.brotliDecompressSync(data).toString('utf8');
    } catch {
      // Fallback for uncompressed legacy data
      return data.toString('utf8');
    }
  }

  /** JSON.parse with a fallback default value. Never throws. */
  private safeParseJSON<T>(raw: string, fallback: T): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}