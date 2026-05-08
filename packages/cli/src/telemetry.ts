/**
 * telemetry.ts — Anonymous, privacy-first crash reporting
 *
 * Integrates Sentry for error tracking but aggressively strips all PII
 * before any data leaves the machine:
 *
 * - File paths are replaced with `<project>/filename.ext`
 * - User home directories are replaced with `~`
 * - Code snippets and diff content are never transmitted
 * - Only Backspace's own stack frames are kept
 *
 * Users can opt out at any time with `backspace telemetry disable`.
 */

import * as Sentry from '@sentry/node';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.backspace');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');

/**
 * Use an env var so the DSN isn't hardcoded in the open-source repo.
 * Falls back to a placeholder — replace this with a real DSN before publishing.
 */
const SENTRY_DSN =
  process.env.BACKSPACE_SENTRY_DSN ?? '';

// ─── Config helpers ───────────────────────────────────────────────────────────

interface GlobalConfig {
  token?: string;
  telemetry?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
}

function readGlobalConfig(): GlobalConfig {
  try {
    const raw = fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as GlobalConfig;
  } catch {
    return {};
  }
}

function writeGlobalConfig(config: GlobalConfig): void {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns `true` if the user has NOT opted out of telemetry.
 * Defaults to `true` (opt-in by default).
 */
export function isTelemetryEnabled(): boolean {
  const config = readGlobalConfig();
  // Explicitly set to false means opted out; anything else means enabled
  return config.telemetry !== false;
}

/**
 * Persists the telemetry preference to `~/.backspace/config.json`.
 */
export function setTelemetryEnabled(enabled: boolean): void {
  const config = readGlobalConfig();
  config.telemetry = enabled;
  config.updatedAt = new Date().toISOString();
  writeGlobalConfig(config);
}

/**
 * Initialises Sentry for crash reporting.
 *
 * Call this once at CLI startup, before any command parsing.
 * If telemetry is disabled or the DSN is empty, this is a no-op.
 */
export function initTelemetry(): void {
  if (!isTelemetryEnabled() || !SENTRY_DSN) {
    return;
  }

  const homeDir = os.homedir();

  Sentry.init({
    dsn: SENTRY_DSN,
    release: getCliVersion(),
    environment: process.env.NODE_ENV ?? 'production',
    // Sample rate — capture all errors but only 10% of transactions
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    // Aggressive PII stripping
    beforeSend(event) {
      return stripPII(event, homeDir);
    },
  });
}

/**
 * Captures an exception and sends it to Sentry (if enabled).
 * This is the primary entry point used by daemon.ts and other modules.
 */
export function captureException(error: unknown): void {
  if (!isTelemetryEnabled() || !SENTRY_DSN) {
    return;
  }

  try {
    Sentry.captureException(error);
  } catch {
    // Telemetry must never crash the CLI itself
  }
}

// ─── PII stripping ───────────────────────────────────────────────────────────

function stripPII(event: Sentry.ErrorEvent, homeDir: string): Sentry.ErrorEvent {
  // 1. Strip user data
  delete event.user;

  // 2. Strip server name / IP
  delete event.server_name;

  // 3. Clean stack traces — keep only Backspace frames, redact file paths
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.stacktrace?.frames) {
        exception.stacktrace.frames = exception.stacktrace.frames
          .filter((frame) => {
            // Keep only frames from the Backspace CLI itself
            const filename = frame.filename ?? '';
            return (
              filename.includes('backspace') ||
              filename.includes('@backspace') ||
              filename.startsWith('file://') // bundled code
            );
          })
          .map((frame) => {
            // Redact absolute paths
            if (frame.filename) {
              frame.filename = redactPath(frame.filename, homeDir);
            }
            if (frame.abs_path) {
              frame.abs_path = redactPath(frame.abs_path, homeDir);
            }
            // Remove code context (source snippets)
            delete frame.pre_context;
            delete frame.context_line;
            delete frame.post_context;
            delete frame.vars;
            return frame;
          });
      }

      // Redact file paths from error messages
      if (exception.value) {
        exception.value = redactPathsInString(exception.value, homeDir);
      }
    }
  }

  // 4. Strip breadcrumbs that might contain file paths or user data
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      if (crumb.message) {
        crumb.message = redactPathsInString(crumb.message, homeDir);
      }
      if (crumb.data) {
        // Remove all breadcrumb data — may contain file content
        crumb.data = {};
      }
      return crumb;
    });
  }

  // 5. Strip request data
  delete event.request;

  return event;
}

function redactPath(filePath: string, homeDir: string): string {
  // Replace the home directory with ~
  let redacted = filePath.replace(homeDir, '~');
  // Replace Windows-style separators
  redacted = redacted.replace(/\\/g, '/');
  // Keep only the last two path segments (e.g. "src/daemon.ts")
  const parts = redacted.split('/');
  if (parts.length > 2) {
    return '<project>/' + parts.slice(-2).join('/');
  }
  return redacted;
}

function redactPathsInString(str: string, homeDir: string): string {
  // Replace home directory paths
  let result = str.replace(new RegExp(escapeRegex(homeDir), 'g'), '~');
  // Replace Windows absolute paths like C:\Users\...
  result = result.replace(/[A-Z]:\\[^\s:]+/gi, '<redacted-path>');
  // Replace Unix absolute paths like /home/user/...
  result = result.replace(/\/(?:home|Users|var|tmp)\/[^\s:]+/g, '<redacted-path>');
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCliVersion(): string {
  try {
    // Walk up from this file to find package.json
    let dir = __dirname;
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return `backspace-cli@${pkg.version ?? '0.0.0'}`;
      }
      dir = path.dirname(dir);
    }
  } catch {
    // Ignore
  }
  return 'backspace-cli@unknown';
}
