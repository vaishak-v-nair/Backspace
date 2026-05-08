/**
 * db.ts — SQLite database layer for Backspace
 *
 * Uses Node.js 22.5+'s built-in `node:sqlite` module — zero native
 * compilation required. The API is synchronous, matching better-sqlite3's
 * ergonomics while shipping zero extra npm dependencies.
 *
 * @see https://nodejs.org/api/sqlite.html
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// ─── Constants ────────────────────────────────────────────────────────────────

export const BACKSPACE_DIR = '.backspace';
export const DB_FILENAME = 'db.sqlite';

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Resolves the absolute path to the hidden `.backspace` directory
 * relative to the user's current working directory.
 */
export function getBackspaceDir(cwd: string = process.cwd()): string {
  return path.join(cwd, BACKSPACE_DIR);
}

/**
 * Resolves the absolute path to the SQLite database file.
 */
export function getDbPath(cwd: string = process.cwd()): string {
  return path.join(getBackspaceDir(cwd), DB_FILENAME);
}

/**
 * Returns true if Backspace has already been initialized in `cwd`.
 */
export function isInitialized(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getDbPath(cwd));
}

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * DDL executed exactly once during `backspace init`.
 *
 * Table: snapshots
 * ┌──────────────────┬─────────┬────────────────────────────────────────────┐
 * │ Column           │ Type    │ Notes                                      │
 * ├──────────────────┼─────────┼────────────────────────────────────────────┤
 * │ id               │ TEXT PK │ UUID v4 via crypto.randomUUID()           │
 * │ timestamp        │ INTEGER │ Unix epoch in milliseconds                 │
 * │ prompt_context   │ TEXT    │ Natural-language prompt the AI was given   │
 * │ file_paths       │ TEXT    │ JSON-serialised string[]                   │
 * │ diff_data        │ TEXT    │ JSON-serialised diff payload               │
 * └──────────────────┴─────────┴────────────────────────────────────────────┘
 */
const SCHEMA_SQL = /* sql */ `
  PRAGMA journal_mode  = WAL;
  PRAGMA foreign_keys  = ON;
  PRAGMA synchronous   = NORMAL;
  PRAGMA busy_timeout  = 5000;

  CREATE TABLE IF NOT EXISTS snapshots (
    id             TEXT    NOT NULL PRIMARY KEY,
    timestamp      INTEGER NOT NULL,
    prompt_context TEXT    NOT NULL,
    file_paths     TEXT    NOT NULL,
    diff_data      TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp
    ON snapshots (timestamp DESC);
`;

// ─── Snapshot types ───────────────────────────────────────────────────────────

/** Raw row as returned by node:sqlite (all values are JS primitives) */
export interface SnapshotRow {
  id: string;
  timestamp: number;
  prompt_context: string;
  /** Stored as a JSON string — deserialise with JSON.parse */
  file_paths: string;
  /** Stored as a JSON string — deserialise with JSON.parse */
  diff_data: string;
}

/** Typed representation after JSON deserialisation */
export interface Snapshot {
  id: string;
  timestamp: Date;
  prompt_context: string;
  file_paths: string[];
  diff_data: Record<string, unknown>;
}

// ─── Database initialisation ──────────────────────────────────────────────────

/**
 * Creates the `.backspace/` directory and the SQLite database if they do
 * not yet exist, then runs the schema DDL.
 *
 * Called exclusively by `backspace init`.
 *
 * @param cwd  The project root where `.backspace/` will be created.
 *             Defaults to `process.cwd()`.
 * @returns    An open `DatabaseSync` instance.
 *             Caller should call `.close()` when done.
 */
export function initDatabase(cwd: string = process.cwd()): DatabaseSync {
  const backspaceDir = getBackspaceDir(cwd);

  // 1. Ensure the hidden directory exists
  fs.mkdirSync(backspaceDir, { recursive: true });

  // 2. Open (or create) the database file
  const db = new DatabaseSync(getDbPath(cwd));

  // 3. Apply schema (PRAGMAs + DDL)
  db.exec(SCHEMA_SQL);

  return db;
}

/**
 * Opens an existing Backspace database.
 * Throws a descriptive error if `backspace init` has not been run yet.
 *
 * @param cwd  The project root. Defaults to `process.cwd()`.
 * @returns    An open `DatabaseSync` instance.
 */
export function openDatabase(cwd: string = process.cwd()): DatabaseSync {
  if (!isInitialized(cwd)) {
    throw new Error(
      `Backspace is not initialized in this directory.\n` +
        `Run \`backspace init\` to set it up.`
    );
  }

  const db = new DatabaseSync(getDbPath(cwd));
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;`);

  return db;
}

// ─── Prepared-statement helpers ───────────────────────────────────────────────

/** Inserts a new snapshot row. Returns the auto-generated `id`. */
export function insertSnapshot(
  db: DatabaseSync,
  snapshot: Omit<Snapshot, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }
): string {
  const id = snapshot.id ?? crypto.randomUUID();
  const timestamp = (snapshot.timestamp ?? new Date()).getTime();

  const stmt = db.prepare(/* sql */ `
    INSERT INTO snapshots (id, timestamp, prompt_context, file_paths, diff_data)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    timestamp,
    snapshot.prompt_context,
    JSON.stringify(snapshot.file_paths),
    JSON.stringify(snapshot.diff_data)
  );

  return id;
}

/**
 * Inserts multiple snapshots in a single atomic transaction.
 * Significantly faster than individual inserts during burst writes
 * and avoids SQLITE_BUSY under high concurrency.
 */
export function insertSnapshotBatch(
  db: DatabaseSync,
  snapshots: Array<Omit<Snapshot, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }>
): string[] {
  const ids: string[] = [];

  db.exec('BEGIN');
  try {
    for (const snapshot of snapshots) {
      const id = insertSnapshot(db, snapshot);
      ids.push(id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return ids;
}

/** Returns all snapshots ordered by most-recent first. */
export function listSnapshots(db: DatabaseSync): Snapshot[] {
  const rows = db
    .prepare('SELECT * FROM snapshots ORDER BY timestamp DESC')
    .all() as unknown as SnapshotRow[];

  return rows.map(deserialise);
}

/** Returns a single snapshot by id, or undefined if not found. */
export function getSnapshot(
  db: DatabaseSync,
  id: string
): Snapshot | undefined {
  const row = db
    .prepare('SELECT * FROM snapshots WHERE id = ?')
    .get(id) as unknown as SnapshotRow | undefined;

  return row ? deserialise(row) : undefined;
}

/** Deletes a snapshot by id. Returns true if a row was deleted. */
export function deleteSnapshot(db: DatabaseSync, id: string): boolean {
  const result = db
    .prepare('DELETE FROM snapshots WHERE id = ?')
    .run(id) as { changes: number };
  return result.changes > 0;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deserialise(row: SnapshotRow): Snapshot {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp),
    prompt_context: row.prompt_context,
    file_paths: JSON.parse(row.file_paths) as string[],
    diff_data: JSON.parse(row.diff_data) as Record<string, unknown>,
  };
}
