/**
 * commands/init.ts — `backspace-ai init`
 *
 * Creates the hidden `.backspace/` directory and SQLite database in the
 * current working directory. Safe to call multiple times (idempotent).
 */

import chalk from 'chalk';
import ora from 'ora';
import path from 'node:path';
import { initDatabase, getBackspaceDir, getDbPath, isInitialized, BACKSPACE_DIR, DB_FILENAME } from '../db.js';

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();
  const backspaceDir = getBackspaceDir(cwd);
  const dbPath = getDbPath(cwd);

  // ── Already initialised? ────────────────────────────────────────────────────
  if (isInitialized(cwd)) {
    console.log(
      chalk.yellow('⚠') +
      chalk.bold('  Backspace is already initialized in this directory.\n')
    );
    console.log(chalk.dim('  Location : ') + chalk.white(backspaceDir));
    console.log(chalk.dim('  Database : ') + chalk.white(dbPath));
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
    const db = initDatabase(cwd);
    // Verify the schema is queryable before declaring success
    db.prepare('SELECT COUNT(*) AS c FROM snapshots').get();
    db.close();

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
