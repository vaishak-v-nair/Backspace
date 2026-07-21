/**
 * index.ts — Backspace CLI entrypoint
 *
 * Registers all top-level commands and delegates to their handlers.
 * The shebang is injected by tsup's banner option; do not add it here.
 */

import { Command } from 'commander';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { initTelemetry, captureException } from './telemetry.js';
import { initCommand } from './commands/init.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { startDaemon } from './daemon.js';
import { logCommand } from './commands/log.js';
import { showCommand } from './commands/show.js';
import { revertCommand } from './commands/revert.js';
import { checkCommand } from './commands/check.js';

import { telemetryCommand } from './commands/telemetry.js';
import { integrateCommand } from './commands/integrate.js';
import { timelineCommand } from './commands/timeline.js';
import { inspectCommand } from './commands/inspect.js';
import { mcpCommand } from './mcp.js';
import { startSupervisedDaemon, isDaemonRunning } from './supervisor.js';
import { BackspaceDB, isInitialized } from './db.js';
import chalk from 'chalk';

// Internal hidden routing flags passed down by the supervisor instance.
// When launched as __daemon-worker, the daemon code is already bundled
// in this same file via tsup — so we start it directly inline instead
// of trying to spawn a separate daemon.ts that doesn't exist post-build.
if (process.argv[2] === "__daemon-worker") {
  // Session ID is passed via environment variable from the supervisor
  const sessionId = process.env.BACKSPACE_SESSION_ID;
  startDaemon({ cwd: process.cwd(), sessionId: sessionId ?? undefined });
} else {

// ── Telemetry (initialise before anything else) ──────────────────────────────

initTelemetry();

// ── CLI Configuration ────────────────────────────────────────────────────────

const program = new Command();

// Resolve the version from package.json at runtime — works both from src/
// (dev) and dist/ (published tarball), and can never drift from the manifest.
const pkg = createRequire(import.meta.url)('../package.json') as { version: string };

program
  .name('backspace-ai')
  .description('AI Provenance Engine — deterministic rollback for AI-assisted coding')
  .version(pkg.version);

// ── Core Commands ────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize Backspace in the current repository')
  .action(() => initCommand({ local: true }));

program
  .command('watch')
  .description('Start the background file watcher daemon')
  .option('--prompt <label>', 'Session label or prompt context')
  .action((opts: { prompt?: string }) => {
    const cwd = process.cwd();

    if (!isInitialized(cwd)) {
      console.error(
        chalk.red('Backspace is not initialized in this directory.\n') +
        chalk.dim('Run `backspace-ai init` first.'),
      );
      process.exit(1);
    }

    // Check BEFORE creating a session — otherwise every repeat `watch` leaves
    // a stray 'active' session with zero events in the database.
    if (isDaemonRunning(cwd)) {
      console.log(chalk.yellow('⚠ Backspace daemon is already running.'));
      console.log(chalk.dim('Run `backspace-ai stop` first to start a new session.'));
      return;
    }

    // Create a session in the database before launching the daemon
    const db = BackspaceDB.open(cwd);
    try {
      const sessionId = crypto.randomUUID();
      const prompt = opts.prompt ?? 'AI coding session';
      db.createSession(sessionId, prompt);
      console.log(chalk.green('✓') + chalk.bold(' Session created: ') + chalk.dim(sessionId.slice(0, 8)));

      // Pass session ID to the daemon via environment variable
      const mainCliExecutablePath = process.argv[1];
      startSupervisedDaemon(mainCliExecutablePath, cwd, sessionId);
    } finally {
      db.close();
    }
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
  .description('List all recorded sessions and snapshots')
  .action(logCommand);

program
  .command('show <id>')
  .description('Pretty-print events/diffs for a session or snapshot')
  .action(showCommand);

program
  .command('revert')
  .description('Revert all changes from a session or snapshot')
  .option('--quiet', 'Suppress post-revert analysis output')
  .option('--id <id>', 'Revert a specific session/snapshot by ID')
  .option('--latest', 'Automatically revert the most recent session')
  .action((opts) => revertCommand(opts));

// ── Provenance Commands ──────────────────────────────────────────────────────

program
  .command('timeline')
  .description('Show chronological timeline of all AI activity')
  .option('--file <path>', 'Filter to a specific file')
  .option('--limit <n>', 'Maximum events to show', '30')
  .action((opts) => timelineCommand({ file: opts.file, limit: parseInt(opts.limit, 10) }));

program
  .command('inspect <event-id>')
  .description('Show detailed provenance for a single event')
  .action(inspectCommand);

program
  .command('check <prompt>')
  .description('Analyze a prompt for risky patterns before starting an AI session')
  .option('--force', 'Skip confirmation prompt on risky patterns')
  .action((prompt, opts) => checkCommand(prompt, opts));

// ── Extended Commands ────────────────────────────────────────────────────────



program
  .command('telemetry')
  .description('Configure telemetry settings')
  .action(telemetryCommand);

program
  .command('integrate <tool>')
  .description('Inject Backspace MCP config into a supported AI tool (e.g. claude)')
  .action(integrateCommand);

program
  .command('mcp')
  .description('Start the Backspace MCP server')
  .action(mcpCommand);

// ── Parse (wrapped to capture unhandled errors) ──────────────────────────────

// Async command handlers (e.g. revert) reject outside the try/catch below —
// catch those at the process level so they're logged instead of silent.
process.on('unhandledRejection', (err) => {
  captureException(err);
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});

try {
  program.parse(process.argv);
} catch (err) {
  captureException(err);
  throw err;
}
}