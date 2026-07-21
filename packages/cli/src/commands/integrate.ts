/**
 * commands/integrate.ts — `backspace integrate <tool>`
 *
 * Automatically configures AI tools to connect to the Backspace MCP server.
 */

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

export function integrateCommand(tool: string): void {
  if (tool !== 'claude') {
    console.error(chalk.red(`Integration with '${tool}' is not supported yet.`));
    console.log(chalk.dim('Currently supported tools: claude'));
    process.exit(1);
  }

  const cwd = process.cwd();
  // Claude Code looks for project-specific MCP servers in .mcp.json at the project root
  const mcpConfigPath = path.join(cwd, '.mcp.json');

  let config: Record<string, any> = {};
  if (fs.existsSync(mcpConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    } catch (err: any) {
      console.error(chalk.red(`Failed to parse existing .mcp.json file: ${err.message}`));
      process.exit(1);
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers['backspace'] = {
    command: 'npx',
    args: ['-y', 'backspace-ai', 'mcp'],
  };

  try {
    fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(chalk.green.bold('✓ Claude Code integration successful!'));
    console.log(chalk.dim(`  Added Backspace MCP server to ${mcpConfigPath}`));
    console.log('');
    console.log(chalk.cyan.bold('Why this matters:'));
    console.log('  Claude can now use Backspace to see the exact red/green diffs of its past actions.');
    console.log('  If it hallucinates or breaks the build, it will proactively use Backspace to');
    console.log('  revert to a stable state instead of burning tokens trying to debug the mess.');
    console.log('');
    console.log(chalk.cyan('Next steps:'));
    console.log(`  1. Run ${chalk.bold('claude')} in this directory.`);
    console.log(`  2. When prompted, approve the new MCP server by running ${chalk.bold('/mcp')} and trusting it.`);
    console.log(`  3. Claude will automatically use the ${chalk.italic('list_sessions')} and ${chalk.italic('get_session_events')} tools.`);
  } catch (err: any) {
    console.error(chalk.red(`Failed to write to ${mcpConfigPath}: ${err.message}`));
    process.exit(1);
  }
}
