/**
 * index.ts — Backspace CLI entrypoint
 *
 * Registers all top-level commands and delegates to their handlers.
 * The shebang is injected by tsup's banner option; do not add it here.
 */

import { Command } from 'commander';
import { initTelemetry, captureException } from './telemetry.js';
import { initCommand } from './commands/init.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { logCommand } from './commands/log.js';
import { showCommand } from './commands/show.js';
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
  const daemonTargetFile = path.join(path.dirname(cliRootEntryPoint), "daemon.ts");
  runSupervisorWorkerLoop(daemonTargetFile);
} else {

// ── Telemetry (initialise before anything else) ──────────────────────────────

initTelemetry();

// ── CLI Configuration ────────────────────────────────────────────────────────

const program = new Command();

program
  .name('backspace-ai')
  .description('Deterministic rollback for AI-assisted coding sessions')
  .version('0.1.0');

// ── Core Commands ────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize Backspace in the current repository')
  .action(initCommand);

program
  .command('watch')
  .description('Start the background file watcher daemon')
  .action(() => {
    const mainCliExecutablePath = process.argv[1];
    startSupervisedDaemon(mainCliExecutablePath);
  });

program
  .command('stop')
  .description('Stop the background daemon')
  .action(stopCommand);

program
  .command('status')
  .description('Show current Backspace status (init state, daemon, DB size)')
  .action(statusCommand);

program
  .command('log')
  .description('List all recorded snapshots')
  .action(logCommand);

program
  .command('show <id>')
  .description('Pretty-print diffs for a specific snapshot')
  .action(showCommand);

program
  .command('revert')
  .description('Interactively select and revert to a previous snapshot')
  .action(revertCommand);

// ── Extended Commands ────────────────────────────────────────────────────────

program
  .command('login')
  .description('Authenticate the CLI with your Backspace account')
  .action(loginCommand);

program
  .command('join')
  .description('Join the beta waitlist')
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

// ── Parse (wrapped to capture unhandled errors) ──────────────────────────────

try {
  program.parse(process.argv);
} catch (err) {
  captureException(err);
  throw err;
}
}