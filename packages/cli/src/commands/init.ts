/**
 * commands/init.ts — `backspace-ai init`
 *
 * Creates the hidden `.backspace/` directory and SQLite database in the
 * current working directory. Safe to call multiple times (idempotent).
 *
 * Flags:
 *   --local  (default) SQLite only, nothing leaves the machine
 *   --sync   Client-side encrypted Supabase sync (future)
 */

import chalk from 'chalk';
import ora from 'ora';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { BackspaceDB, getBackspaceDir, getDbPath, isInitialized, BACKSPACE_DIR, DB_FILENAME } from '../db.js';

export type BackspaceMode = 'local' | 'sync';

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.backspace');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');

interface BackspaceConfig {
  mode: BackspaceMode;
  token?: string;
  telemetry?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Read global config from ~/.backspace/config.json */
export function readGlobalConfig(): BackspaceConfig {
  try {
    if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return { mode: 'local' };
}

/** Write global config to ~/.backspace/config.json */
function writeGlobalConfig(config: BackspaceConfig): void {
  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function initCommand(options: { local?: boolean; sync?: boolean } = {}): Promise<void> {
  const cwd = process.cwd();
  const backspaceDir = getBackspaceDir(cwd);
  const dbPath = getDbPath(cwd);

  // Determine mode: --sync explicitly opts in, everything else defaults to local
  const mode: BackspaceMode = options.sync ? 'sync' : 'local';

  // ── Already initialised? ────────────────────────────────────────────────────
  if (isInitialized(cwd)) {
    console.log(
      chalk.yellow('⚠') +
      chalk.bold('  Backspace is already initialized in this directory.\n')
    );
    console.log(chalk.dim('  Location : ') + chalk.white(backspaceDir));
    console.log(chalk.dim('  Database : ') + chalk.white(dbPath));
    console.log(chalk.dim('  Mode     : ') + chalk.cyan(mode === 'local' ? 'Local Only' : 'Encrypted Sync'));
    console.log('');
    console.log(
      chalk.dim('  Run ') +
      chalk.cyan('backspace-ai watch') +
      chalk.dim(' to start tracking changes.')
    );
    return;
  }

  // ── Initialise ──────────────────────────────────────────────────────────────
  const spinner = ora({
    text: chalk.dim('Setting up Backspace…'),
    color: 'cyan',
  }).start();

  try {
    const db = BackspaceDB.open(cwd);
    // Verify the schema is queryable before declaring success
    db.handle.prepare('SELECT COUNT(*) AS c FROM snapshots').get();
    db.close();

    // Save mode preference to global config
    const config = readGlobalConfig();
    config.mode = mode;
    config.updatedAt = new Date().toISOString();
    writeGlobalConfig(config);

    spinner.succeed(chalk.green.bold('Backspace initialized'));

    console.log('');

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log(chalk.dim('  Created:'));
    console.log(
      chalk.dim('    ') +
      chalk.cyan(path.join('.', BACKSPACE_DIR, '/')) +
      chalk.dim('         ← hidden runtime directory')
    );
    console.log(
      chalk.dim('    ') +
      chalk.cyan(path.join('.', BACKSPACE_DIR, DB_FILENAME)) +
      chalk.dim('  ← SQLite database')
    );

    console.log('');

    // ── Mode indicator ────────────────────────────────────────────────────────
    if (mode === 'local') {
      console.log(
        chalk.dim('  Mode: ') +
        chalk.green.bold('🔒 Local Only') +
        chalk.dim(' — your code never leaves this machine')
      );
    } else {
      console.log(
        chalk.dim('  Mode: ') +
        chalk.blue.bold('☁️  Encrypted Sync') +
        chalk.dim(' — AES-256-GCM encrypted before any upload')
      );
    }

    console.log('');

    // ── Next steps ────────────────────────────────────────────────────────────
    console.log(chalk.dim('  Next steps:'));
    console.log(
      chalk.dim('    1. Run ') +
      chalk.cyan('backspace-ai watch') +
      chalk.dim(' to start tracking changes')
    );
    console.log(
      chalk.dim('    2. Use your AI coding tool normally')
    );
    console.log(
      chalk.dim('    3. Run ') +
      chalk.cyan('backspace-ai stop') +
      chalk.dim(' when the session is done')
    );
    console.log(
      chalk.dim('    4. Run ') +
      chalk.cyan('backspace-ai revert') +
      chalk.dim(' if you need to undo everything')
    );
    console.log('');
  } catch (err) {
    spinner.fail(chalk.red.bold('Initialization failed.'));
    console.error('');
    if (err instanceof Error) {
      console.error(chalk.red('  Error: ') + err.message);
      if (err.stack) {
        console.error(chalk.dim(err.stack.split('\n').slice(1).join('\n')));
      }
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}
