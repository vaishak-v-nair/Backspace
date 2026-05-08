/**
 * index.ts — Backspace CLI entrypoint
 *
 * Registers all top-level commands and delegates to their handlers.
 * The shebang is injected by tsup's banner option; do not add it here.
 */

import { Command } from 'commander';
import { initTelemetry, captureException } from './telemetry.js';
import { initCommand } from './commands/init.js';
import { watchCommand } from './commands/watch.js';
import { revertCommand } from './commands/revert.js';
import { loginCommand } from './commands/login.js';
import { telemetryCommand } from './commands/telemetry.js';
import { integrateCommand } from './commands/integrate.js';
import { mcpCommand } from './mcp.js';

// ── Telemetry (initialise before anything else) ──────────────────────────────

initTelemetry();

// ── CLI setup ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('backspace')
  .description(
    'Deterministic state management for AI-driven coding sessions.\n' +
      'Capture diffs, tag them with prompts, roll back in one command.'
  )
  .version('0.1.0', '-v, --version', 'Print the current Backspace version');

// ── Commands ──────────────────────────────────────────────────────────────────

program
  .command('init')
  .description(
    'Initialize Backspace in the current project directory.\n' +
      'Creates a .backspace/ folder with a local SQLite database.'
  )
  .action(initCommand);

program
  .command('watch')
  .description(
    'Start the Backspace daemon to watch for file changes and auto-capture snapshots.'
  )
  .action(watchCommand);

program
  .command('revert')
  .description(
    'Open the Time Machine interactive menu to revert to a previous snapshot.'
  )
  .action(revertCommand);

program
  .command('login')
  .description('Log in to the Backspace web app to sync your snapshots globally.')
  .action(loginCommand);

program
  .command('telemetry [action]')
  .description(
    'Manage anonymous crash reporting.\n' +
      '  status   — Show whether telemetry is enabled (default)\n' +
      '  enable   — Opt in to anonymous crash reporting\n' +
      '  disable  — Opt out of crash reporting'
  )
  .action(telemetryCommand);

program
  .command('integrate <tool>')
  .description('Automatically configure AI tools (like claude) to connect to Backspace.')
  .action(integrateCommand);

program
  .command('mcp')
  .description('Start the Backspace MCP server over stdio for AI agents.')
  .action(async () => {
    try {
      await mcpCommand();
    } catch (err) {
      captureException(err);
      console.error('[Backspace MCP] Fatal error:', err);
      process.exit(1);
    }
  });

// ── Future commands (stubs — will be wired in subsequent phases) ──────────────
// program.command('log').description('...')
// program.command('show').description('...')

// ── Parse (wrapped to capture unhandled errors) ──────────────────────────────

try {
  program.parse(process.argv);
} catch (err) {
  captureException(err);
  throw err;
}
