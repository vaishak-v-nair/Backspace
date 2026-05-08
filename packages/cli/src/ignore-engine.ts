/**
 * ignore-engine.ts — Intelligent file filter for the Backspace watcher
 *
 * Prevents the daemon from scanning, caching, or diffing files that would
 * cause CPU/memory issues:
 *
 * 1. Reads the project's `.gitignore` (via the `ignore` npm package) and
 *    blinds the watcher to everything Git would ignore.
 * 2. Maintains a hardcoded safety-net deny-list for paths that must ALWAYS
 *    be excluded regardless of `.gitignore` contents.
 * 3. Detects binary files by checking the first 8 KB for null bytes.
 * 4. Enforces a configurable max file-size cap (default 1 MB).
 */

import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Files larger than this (in bytes) are silently skipped. Default: 1 MB */
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

/** How many bytes to read for the binary-detection heuristic */
const BINARY_SNIFF_BYTES = 8192;

// ─── Hardcoded safety-net (always excluded, even without .gitignore) ─────────

const ALWAYS_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.backspace',
  '.next',
  '.nuxt',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  '.turbo',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.svn',
  '.hg',
]);

/** File extensions that are always binary — never diff these */
const BINARY_EXTENSIONS = new Set([
  // Compiled / executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
  '.wasm', '.class', '.pyc', '.pyo',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif',
  '.svg', '.tiff', '.tif', '.psd',
  // Fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // Audio / video
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wav', '.ogg', '.flac', '.webm',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz', '.zst',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Database files
  '.sqlite', '.sqlite3', '.db',
  // Source maps & lock files (diffing these is noise)
  '.map',
  // Package lock files (massive, not useful to diff)
  '.lock',
]);

// ─── Public API ───────────────────────────────────────────────────────────────

export interface IgnoreFilter {
  /**
   * Returns `true` if the file at `relativePath` should be completely
   * ignored by the watcher (gitignore match or hardcoded exclusion).
   */
  shouldIgnore(relativePath: string): boolean;

  /**
   * Returns `true` if the file is binary based on its extension.
   * For a deeper check (null-byte sniffing), use `isBinaryFile()`.
   */
  isBinaryPath(relativePath: string): boolean;

  /**
   * Returns `true` if the file's size exceeds the configured cap.
   * Returns `false` if the file doesn't exist or can't be stat'd.
   */
  isOversized(absolutePath: string): boolean;

  /**
   * Combined gate: returns `true` if the file should be skipped for any
   * reason (ignored, binary, oversized). This is the main entry point
   * that `daemon.ts` should call.
   */
  shouldSkip(relativePath: string, absolutePath: string): boolean;

  /**
   * Returns `true` if the raw file content appears to be binary
   * (contains null bytes in the first 8 KB).
   */
  isBinaryFile(absolutePath: string): boolean;
}

/**
 * Creates a filter instance for the given project root.
 *
 * Reads `.gitignore` once at creation time. If `.gitignore` is missing,
 * only the hardcoded safety-net rules apply.
 */
export function createIgnoreFilter(cwd: string): IgnoreFilter {
  const ig = loadGitignore(cwd);

  return {
    shouldIgnore(relativePath: string): boolean {
      // Normalise to forward slashes for the `ignore` package
      const normalized = relativePath.split(path.sep).join('/');

      // Check hardcoded deny-list first (fastest path)
      const parts = normalized.split('/');
      for (const part of parts) {
        if (ALWAYS_IGNORED_DIRS.has(part)) return true;
      }

      // Check .gitignore rules
      return ig.ignores(normalized);
    },

    isBinaryPath(relativePath: string): boolean {
      const ext = path.extname(relativePath).toLowerCase();
      return BINARY_EXTENSIONS.has(ext);
    },

    isOversized(absolutePath: string): boolean {
      try {
        const stat = fs.statSync(absolutePath);
        return stat.size > MAX_FILE_SIZE_BYTES;
      } catch {
        return false; // Can't stat → don't skip on size grounds
      }
    },

    isBinaryFile(absolutePath: string): boolean {
      try {
        const fd = fs.openSync(absolutePath, 'r');
        const buf = Buffer.alloc(BINARY_SNIFF_BYTES);
        const bytesRead = fs.readSync(fd, buf, 0, BINARY_SNIFF_BYTES, 0);
        fs.closeSync(fd);

        // Look for null bytes — standard binary detection heuristic
        for (let i = 0; i < bytesRead; i++) {
          if (buf[i] === 0) return true;
        }
        return false;
      } catch {
        return false; // Can't read → assume text
      }
    },

    shouldSkip(relativePath: string, absolutePath: string): boolean {
      if (this.shouldIgnore(relativePath)) return true;
      if (this.isBinaryPath(relativePath)) return true;
      if (this.isOversized(absolutePath)) return true;
      return false;
    },
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Reads and parses the `.gitignore` file at the project root.
 * Returns a no-op ignore instance if the file doesn't exist.
 */
function loadGitignore(cwd: string): Ignore {
  const ig = ignore();

  const gitignorePath = path.join(cwd, '.gitignore');
  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(content);
  } catch {
    // No .gitignore found — that's fine, hardcoded rules still apply
  }

  return ig;
}
