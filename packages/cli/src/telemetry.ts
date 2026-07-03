/**
 * telemetry.ts — Telemetry configuration (permanently disabled)
 *
 * Backspace is a local-first tool. Nothing leaves the user's machine.
 *
 * This module preserves the public API (`initTelemetry`, `captureException`)
 * so existing callers don't break, but all external reporting has been
 * removed. The Sentry dependency is no longer imported.
 *
 * The only remaining functionality is reading/writing the user's telemetry
 * preference flag in `~/.backspace/config.json`, which exists purely for
 * user-facing transparency.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.backspace');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');

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
 * Note: telemetry is permanently disabled — no data is ever sent.
 * This flag exists solely for user-facing transparency in the config file.
 */
export function isTelemetryEnabled(): boolean {
  const config = readGlobalConfig();
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
 * Initialises telemetry. This is now a no-op — Sentry has been removed.
 * Kept for API compatibility with index.ts.
 */
export function initTelemetry(): void {
  // No-op. Nothing leaves the machine.
}

/**
 * Captures an exception for error tracking. This is now a no-op —
 * Sentry has been removed. Errors are logged to stderr only.
 */
export function captureException(error: unknown): void {
  // Log to stderr for local debugging, but never transmit
  if (error instanceof Error) {
    console.error(`[Backspace] Unhandled error: ${error.message}`);
  }
}
