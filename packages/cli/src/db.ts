import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import zlib from 'zlib';
import crypto from 'crypto';

export const BACKSPACE_DIR = '.backspace';
export const DB_FILENAME = 'local.db';

export interface SnapshotPayload {
  prompt: string;
  files_changed: string; // JSON string representing string[]
  diff_payload: string; // JSON string representing the diff data
}

export function getBackspaceDir(cwd: string): string {
  return path.join(cwd, BACKSPACE_DIR);
}

export function getDbPath(cwd: string): string {
  return path.join(getBackspaceDir(cwd), DB_FILENAME);
}

export function isInitialized(cwd: string): boolean {
  return fs.existsSync(getDbPath(cwd));
}

export function initDatabase(cwd: string): Database.Database {
  const dbPath = getDbPath(cwd);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    } catch (err) {
      console.error(`[LocalDB] Failed to create directory ${dir}:`, err);
      throw err;
    }
  }

  try {
    const db = new Database(dbPath);
    // CRITICAL: Prevent SQLITE_BUSY locks during massive concurrent AI refactors
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 5000');
    
    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        prompt TEXT,
        files_changed TEXT,
        diff_payload BLOB
      );
    `);
    
    return db;
  } catch (err) {
    console.error(`[LocalDB] Failed to initialize database at ${dbPath}:`, err);
    throw err;
  }
}

export function openDatabase(cwd: string): Database.Database {
  return initDatabase(cwd);
}

export function listSnapshots(db: Database.Database): any[] {
  try {
    const stmt = db.prepare('SELECT id, timestamp, prompt as prompt_context, files_changed as file_paths FROM snapshots ORDER BY timestamp DESC');
    const rows = stmt.all();
    return rows.map((r: any) => ({
      ...r,
      file_paths: JSON.parse(r.file_paths),
      timestamp: new Date(r.timestamp)
    }));
  } catch (err) {
    return [];
  }
}

export function getSnapshot(db: Database.Database, id: string): any {
  try {
    const stmt = db.prepare('SELECT id, timestamp, prompt as prompt_context, files_changed as file_paths, diff_payload as diff_data FROM snapshots WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    
    let diff_data_str = "";
    if (row.diff_data) {
      try {
        diff_data_str = zlib.brotliDecompressSync(row.diff_data).toString('utf8');
      } catch (e) {
        // Fallback for uncompressed old data
        diff_data_str = row.diff_data.toString('utf8');
      }
    }

    return {
      ...row,
      file_paths: JSON.parse(row.file_paths),
      diff_data: diff_data_str ? JSON.parse(diff_data_str) : {},
      timestamp: new Date(row.timestamp)
    };
  } catch (err) {
    return null;
  }
}

export class LocalDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(os.homedir(), '.backspace', 'local.db');
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('busy_timeout = 5000');
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        prompt TEXT,
        files_changed TEXT,
        diff_payload BLOB
      );
    `);
  }

  public batchInsertSnapshots(snapshots: SnapshotPayload[]) {
    const insert = this.db.prepare(`
      INSERT INTO snapshots (id, prompt, files_changed, diff_payload)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: any[]) => {
      for (const item of items) {
        const id = crypto.randomUUID();
        const compressedPayload = zlib.brotliCompressSync(Buffer.from(item.diff_payload, "utf8"));
        insert.run(id, item.prompt, item.files_changed, compressedPayload);
      }
    });

    insertMany(snapshots);
  }

  // Adding the saveCompressedSnapshot as requested, mapped properly.
  public saveCompressedSnapshot(id: string, diffText: string, filesChanged: string = "[]", prompt: string = "Manual Snapshot") {
    const compressedPayload = zlib.brotliCompressSync(Buffer.from(diffText, "utf8"));
    const stmt = this.db.prepare("INSERT INTO snapshots (id, prompt, files_changed, diff_payload) VALUES (?, ?, ?, ?)");
    stmt.run(id, prompt, filesChanged, compressedPayload);
  }

  public getRecentSnapshots(limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, prompt as prompt_context, files_changed as file_paths
      FROM snapshots
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    return rows.map((r: any) => ({
      ...r,
      files_changed: JSON.parse(r.file_paths),
      timestamp: new Date(r.timestamp)
    }));
  }

  public getSnapshotById(id: string): any {
    const stmt = this.db.prepare('SELECT id, timestamp, prompt as prompt_context, files_changed as file_paths, diff_payload as diff_data FROM snapshots WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    
    let diff_data_str = "";
    if (row.diff_data) {
      try {
        diff_data_str = zlib.brotliDecompressSync(row.diff_data).toString('utf8');
      } catch (e) {
        // Fallback for uncompressed old data
        diff_data_str = row.diff_data.toString('utf8');
      }
    }

    return {
      ...row,
      file_paths: JSON.parse(row.file_paths),
      diff_payload: diff_data_str,
      timestamp: new Date(row.timestamp)
    };
  }
}