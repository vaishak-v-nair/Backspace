import express from 'express';
import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { Server } from 'http';

export async function joinCommand() {
  const port = 8080;
  const app = express();
  let server: Server;
  
  // Use localhost:3000 for local dev, or a production URL if set
  const webAppUrl = process.env.BACKSPACE_WEB_URL || 'http://localhost:3000';
  const joinUrl = `${webAppUrl}/join`;

  console.log(chalk.blue.bold('\n⌫ Backspace Auth'));
  console.log(chalk.gray('Securely bridging your CLI to the cloud...'));
  
  const spinner = ora('Starting local authentication server...').start();

  app.get('/callback', (req, res) => {
    const token = req.query.token as string;
    
    if (!token) {
      res.status(400).send('<h1>Authentication Failed</h1><p>Missing token.</p>');
      spinner.fail('Authentication failed: Missing token in callback.');
      server.close();
      process.exit(1);
    }

    try {
      // Securely store the token in ~/.backspace/config.json
      const configDir = path.join(os.homedir(), '.backspace');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const configPath = path.join(configDir, 'config.json');
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      config = { ...config, token };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

      // Return success HTML to browser
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: monospace; background: #050505; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0A0A0A; border: 1px solid #333; padding: 40px; border-radius: 16px; text-align: center; }
            h1 { color: #4ade80; margin-top: 0; }
            p { color: #888; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✓ Authentication Successful</h1>
            <p>You're on the waitlist!</p>
            <p>You can safely close this window and return to your terminal.</p>
          </div>
        </body>
        </html>
      `);

      spinner.succeed(chalk.green('Successfully authenticated!'));
      console.log(chalk.dim(`Token saved to ${configPath}\n`));
      
      // Clean up server
      server.close(() => {
        process.exit(0);
      });
      
    } catch (err: any) {
      res.status(500).send('<h1>Internal Server Error</h1><p>Failed to save configuration.</p>');
      spinner.fail('Authentication failed: ' + err.message);
      server.close();
      process.exit(1);
    }
  });

  server = app.listen(port, async () => {
    spinner.text = `Waiting for authentication at ${joinUrl}...`;
    try {
      await open(joinUrl);
    } catch (err) {
      spinner.info(`Could not open browser automatically. Please visit:\n${joinUrl}`);
    }
  });
}
