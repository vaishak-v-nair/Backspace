/**
 * commands/init.ts — `backspace init`
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
      chalk.cyan('backspace start "<prompt>"') +
      chalk.dim(' to begin a new session.')
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

    spinner.succeed(chalk.green.bold('Backspace initialized successfully!'));

    console.log('');

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log(chalk.bold('  Created files'));
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

    // ── Schema summary ────────────────────────────────────────────────────────
    console.log(chalk.bold('  Schema'));
    const schemaLines = [
      ['id', 'TEXT PRIMARY KEY', 'UUID v4'],
      ['timestamp', 'INTEGER', 'Unix epoch ms'],
      ['prompt_context', 'TEXT', 'AI prompt that triggered the session'],
      ['file_paths', 'TEXT (JSON)', 'Array of affected file paths'],
      ['diff_data', 'TEXT (JSON)', 'Unified diff payload per file'],
    ];

    const colWidth = Math.max(...schemaLines.map(([col]) => col.length));
    for (const [col, type, note] of schemaLines) {
      console.log(
        chalk.dim('    ') +
        chalk.cyan(col.padEnd(colWidth + 2)) +
        chalk.yellow(type.padEnd(18)) +
        chalk.dim(note)
      );
    }

    console.log('');

    // ── Next steps ────────────────────────────────────────────────────────────
    console.log(chalk.bold('  Next steps'));
    console.log(
      chalk.dim('    1.  Add ') +
      chalk.cyan(BACKSPACE_DIR + '/') +
      chalk.dim(' to your .gitignore')
    );
    console.log(
      chalk.dim('    2.  Run ') +
      chalk.cyan('backspace start "<your AI prompt>"') +
      chalk.dim(' before handing off to an AI agent')
    );
    console.log(
      chalk.dim('    3.  Run ') +
      chalk.cyan('backspace log') +
      chalk.dim(' to review captured sessions')
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
