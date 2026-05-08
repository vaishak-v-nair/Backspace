/**
 * commands/telemetry.ts — `backspace telemetry` command
 *
 * Subcommands:
 *   backspace telemetry status   — Show whether telemetry is enabled
 *   backspace telemetry enable   — Opt in to anonymous crash reporting
 *   backspace telemetry disable  — Opt out of crash reporting
 */

import chalk from 'chalk';
import { isTelemetryEnabled, setTelemetryEnabled } from '../telemetry.js';

export function telemetryCommand(action?: string): void {
  switch (action) {
    case 'enable': {
      setTelemetryEnabled(true);
      console.log(
        chalk.green.bold('✓ Telemetry enabled.') + '\n' +
        chalk.dim('  Anonymous crash reports help us fix bugs faster.\n') +
        chalk.dim('  No file paths, code, or personal data are ever sent.')
      );
      break;
    }

    case 'disable': {
      setTelemetryEnabled(false);
      console.log(
        chalk.yellow.bold('✗ Telemetry disabled.') + '\n' +
        chalk.dim('  No crash reports will be sent.\n') +
        chalk.dim('  Run `backspace telemetry enable` to opt back in.')
      );
      break;
    }

    case 'status':
    default: {
      const enabled = isTelemetryEnabled();
      if (enabled) {
        console.log(
          chalk.cyan('Telemetry: ') + chalk.green.bold('enabled') + '\n' +
          chalk.dim('  Anonymous crash reports are being sent.\n') +
          chalk.dim('  Run `backspace telemetry disable` to opt out.')
        );
      } else {
        console.log(
          chalk.cyan('Telemetry: ') + chalk.yellow.bold('disabled') + '\n' +
          chalk.dim('  No data is being sent.\n') +
          chalk.dim('  Run `backspace telemetry enable` to opt in.')
        );
      }
      break;
    }
  }
}
