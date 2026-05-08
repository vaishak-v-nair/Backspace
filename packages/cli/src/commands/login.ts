import express from 'express';
import open from 'open';
import ora from 'ora';
import chalk from 'chalk';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

const PORT = 8080;
const LOGIN_URL = 'http://localhost:3000/login';

export async function loginCommand(): Promise<void> {
  const spinner = ora('Waiting for authentication...').start();

  const app = express();

  const server = app.listen(PORT, async () => {
    try {
      // Launch the default web browser to the login page
      await open(LOGIN_URL);
    } catch (err) {
      spinner.fail('Failed to open the browser.');
      console.log(chalk.dim(`Please navigate manually to: ${LOGIN_URL}`));
    }
  });

  app.get('/callback', async (req, res) => {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).send('<h1>Authentication failed: No token provided.</h1><p>You can close this window and try again.</p>');
      spinner.fail('Authentication failed. No token received.');
      server.close();
      process.exit(1);
    }

    try {
      // Create ~/.backspace-global/ directory if it doesn't exist
      const globalDir = path.join(os.homedir(), '.backspace-global');
      await fs.mkdir(globalDir, { recursive: true });

      const configPath = path.join(globalDir, 'config.json');

      // Save token securely to config.json
      const configData = {
        token,
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(configPath, JSON.stringify(configData, null, 2), { mode: 0o600 }); // Secure permissions

      // Send success response to browser
      res.send(`
        <html>
          <head><title>Backspace Authenticated</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #09090b; color: #fafafa;">
            <div style="text-align: center;">
              <h1 style="color: #34d399;">Authentication Successful</h1>
              <p style="color: #a1a1aa;">You can safely close this window and return to your terminal.</p>
            </div>
          </body>
        </html>
      `);

      spinner.succeed(chalk.green.bold('Successfully logged in!'));
      console.log(chalk.dim(`Token securely saved to ${configPath}`));

    } catch (err: any) {
      res.status(500).send('<h1>Internal Server Error</h1><p>Failed to save the configuration.</p>');
      spinner.fail('Authentication failed. Could not save the token.');
      console.error(chalk.red(err.message));
    } finally {
      // Shut down the temporary Express server
      server.close();
      // Optional: process.exit(0) but typically commander handles exiting if event loop empties
      setTimeout(() => process.exit(0), 100);
    }
  });
}
