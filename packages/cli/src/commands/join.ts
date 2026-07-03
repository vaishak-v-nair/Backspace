/**
 * commands/join.ts — `backspace-ai join`
 *
 * Cloud waitlist is not available from the CLI in V1.
 * Users can join the waitlist via the web app at backspace-three.vercel.app.
 */

import chalk from 'chalk';

export async function joinCommand() {
  console.log('');
  console.log(chalk.yellow.bold('  ⚠  Cloud features are not yet available'));
  console.log('');
  console.log(chalk.dim('  Backspace V1 is a strict local-first product.'));
  console.log(chalk.dim('  The CLI runs entirely on your machine with zero network calls.'));
  console.log('');
  console.log(chalk.white('  To join the beta waitlist, visit:'));
  console.log(chalk.cyan.bold('  → https://backspace-three.vercel.app'));
  console.log('');
  process.exit(0);
}
