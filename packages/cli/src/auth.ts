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
      // 1. Launch the default web browser to the login page
      await open(LOGIN_URL);
    } catch (err) {
      spinner.fail('Failed to open the browser.');
      console.log(chalk.dim(`Please navigate manually to: ${LOGIN_URL}`));
    }
  });

  // 2. Local Express server listening for the callback
  app.get('/callback', async (req, res) => {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).send(`
        <html>
          <head><title>Authentication Failed</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #09090b; color: #fafafa;">
            <div style="text-align: center;">
              <h1 style="color: #ef4444;">Authentication Failed</h1>
              <p style="color: #a1a1aa;">No token was provided. You can close this window and try again.</p>
            </div>
          </body>
        </html>
      `);
      spinner.fail('Authentication failed. No token received.');
      server.close();
      process.exit(1);
    }

    try {
      // 3. Save the token securely to ~/.backspace/config.json
      const configDir = path.join(os.homedir(), '.backspace');
      await fs.mkdir(configDir, { recursive: true });

      const configPath = path.join(configDir, 'config.json');

      const configData = {
        token,
        updatedAt: new Date().toISOString(),
      };
      
      // Save with strict 600 permissions
      await fs.writeFile(configPath, JSON.stringify(configData, null, 2), { mode: 0o600 });

      // 4. Send a simple HTML success message back to the browser
      res.send(`
        <html>
          <head><title>Authentication Successful</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #09090b; color: #fafafa;">
            <div style="text-align: center;">
              <h1 style="color: #34d399;">Authentication successful!</h1>
              <p style="color: #a1a1aa;">You can close this window.</p>
            </div>
          </body>
        </html>
      `);

      // 5. Shut down the Express server and print green success message
      spinner.succeed(chalk.green.bold('Successfully authenticated and logged in!'));
      console.log(chalk.dim(`Token securely saved to ${configPath}`));

    } catch (err: any) {
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #09090b; color: #fafafa;">
            <div style="text-align: center;">
              <h1 style="color: #ef4444;">Internal Server Error</h1>
              <p style="color: #a1a1aa;">Failed to save the configuration.</p>
            </div>
          </body>
        </html>
      `);
      spinner.fail('Authentication failed. Could not save the token.');
      console.error(chalk.red(err.message));
    } finally {
      server.close();
      setTimeout(() => process.exit(0), 100);
    }
  });
}
