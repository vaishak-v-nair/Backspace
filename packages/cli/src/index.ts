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
import { joinCommand } from './commands/join.js';
import { telemetryCommand } from './commands/telemetry.js';
import { integrateCommand } from './commands/integrate.js';
import { mcpCommand } from './mcp.js';
import { startSupervisedDaemon, runSupervisorWorkerLoop } from './supervisor.js';
import path from 'path';

// Internal hidden routing flags passed down by the supervisor instance
if (process.argv[2] === "__daemon-worker") {
  const cliRootEntryPoint = process.argv[1];
  // Convert current runtime path down to execute daemon.ts smoothly
  // Note: Since we are running with tsx in dev, we point to daemon.ts
  const daemonTargetFile = path.join(path.dirname(cliRootEntryPoint), "daemon.ts");
  runSupervisorWorkerLoop(daemonTargetFile);
} else {

// ── Telemetry (initialise before anything else) ──────────────────────────────

initTelemetry();

// ── CLI Configuration ────────────────────────────────────────────────────────

const program = new Command();

program
  .name('backspace')
  .description('Deterministic state management for AI coding sessions')
  .version('0.1.0');

// ── Command Registration ─────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize Backspace in the current repository')
  .action(initCommand);

program
  .command('watch')
  .description('Launch the indestructible background file tracking pipeline')
  .action(() => {
    const mainCliExecutablePath = process.argv[1];
    startSupervisedDaemon(mainCliExecutablePath);
  });

program
  .command('revert')
  .description('Roll back to a previous deterministic codebase state')
  .action(revertCommand);

program
  .command('login')
  .description('Authenticate the CLI with your Backspace account')
  .action(loginCommand);

program
  .command('join')
  .description('Join an existing project from a remote repository')
  .action(joinCommand);

program
  .command('telemetry')
  .description('Configure telemetry settings')
  .action(telemetryCommand);

program
  .command('integrate')
  .description('Inject Backspace MCP config into Claude Desktop')
  .action(integrateCommand);

program
  .command('mcp')
  .description('Start the Backspace MCP server')
  .action(mcpCommand);

// ── Future Commands (Placeholders) ───────────────────────────────────────────
// program.command('log').description('...')
// program.command('show').description('...')

// ── Parse (wrapped to capture unhandled errors) ──────────────────────────────

try {
  program.parse(process.argv);
} catch (err) {
  captureException(err);
  throw err;
}
}