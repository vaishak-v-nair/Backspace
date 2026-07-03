/**
 * commands/telemetry.ts — `backspace-ai telemetry`
 *
 * Backspace is a strict local-first product.
 * Telemetry is permanently disabled by design — zero bytes leave the machine.
 */

import chalk from 'chalk';

export function telemetryCommand() {
  console.log('');
  console.log(chalk.green.bold('  🔒 Telemetry: permanently disabled'));
  console.log('');
  console.log(chalk.dim('  Backspace is a strict local-first product.'));
  console.log(chalk.dim('  Zero bytes of data will ever leave your machine.'));
  console.log(chalk.dim('  No crash reports, no analytics, no phone-home — by design.'));
  console.log('');
}
