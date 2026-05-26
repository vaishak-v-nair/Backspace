import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getBackspaceDir } from "./db.js";

/**
 * Checks if an active daemon instance is already running by verifying the PID file.
 */
export function isDaemonRunning(cwd: string = process.cwd()): boolean {
  const pidFile = path.join(getBackspaceDir(cwd), "daemon.pid");
  if (!fs.existsSync(pidFile)) return false;
  try {
    const pid = parseInt(fs.readFileSync(pidFile, "utf8"), 10);
    // process.kill(pid, 0) checks for the existence of the process without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    // Process is dead, clean up stale PID file safely
    try { fs.unlinkSync(pidFile); } catch {}
    return false;
  }
}

/**
 * Spawns the daemon process as a completely detached background supervisor worker loop.
 */
export function startSupervisedDaemon(cliEntryPointPath: string, cwd: string = process.cwd()) {
  const backspaceDir = getBackspaceDir(cwd);
  if (!fs.existsSync(backspaceDir)) {
    fs.mkdirSync(backspaceDir, { recursive: true, mode: 0o700 });
  }

  if (isDaemonRunning(cwd)) {
    console.log("⚠️ Backspace watcher daemon is already running smoothly in the background.");
    return;
  }

  console.log("🚀 Initializing indestructible Backspace supervisor...");

  const logFile = path.join(backspaceDir, "daemon.log");
  const pidFile = path.join(backspaceDir, "daemon.pid");

  const isDev = cliEntryPointPath.endsWith('.ts');
  let execCmd = process.execPath;
  let execArgs = [cliEntryPointPath, "__daemon-worker"];

  if (isDev) {
    execCmd = 'npx';
    execArgs = ['tsx', cliEntryPointPath, "__daemon-worker"];
  }

  // Open log stream for tracking child process crashes
  const logStream = fs.openSync(logFile, "a");

  // Spawn the child daemon process detached from the current terminal context
  const child = spawn(execCmd, execArgs, {
    detached: true,
    cwd,
    stdio: ["ignore", logStream, logStream],
    env: { ...process.env, NODE_ENV: "production" },
    shell: process.platform === 'win32'
  });

  if (child.pid) {
    // Write the verified PID immediately to disk
    fs.writeFileSync(pidFile, child.pid.toString(), "utf8");
    console.log(`📡 Daemon successfully detached into background. (PID: ${child.pid})`);
  } else {
    console.error("❌ Failed to start the background daemon process.");
  }
  
  // Unref allows the parent CLI execution to exit cleanly while the child continues living
  child.unref();
}

/**
 * The internal crash monitoring worker loop.
 * Runs inside the background worker process to catch faults and respawn the watcher.
 */
export function runSupervisorWorkerLoop(daemonModulePath: string, cwd: string = process.cwd()) {
  const backspaceDir = getBackspaceDir(cwd);
  const logFile = path.join(backspaceDir, "daemon.log");

  const spawnWatcher = () => {
    // Wait for the watcher to spawn, pass args nicely.
    // However, since we are transpiled with tsup, we might need to spawn it using tsx or node depending on the environment.
    // If daemonModulePath is a .ts file, we run `npx tsx <path>` for dev mode.
    const isDev = daemonModulePath.endsWith('.ts');
    
    let execCmd = process.execPath;
    let execArgs = [daemonModulePath];

    if (isDev) {
      execCmd = 'npx';
      execArgs = ['tsx', daemonModulePath];
    }

    // Pass __daemon-run so daemon.js actually executes startDaemon()
    execArgs.push('__daemon-run');

    const watcherProcess = spawn(execCmd, execArgs, {
      cwd,
      stdio: "inherit",
      shell: process.platform === 'win32'
    });

    watcherProcess.on("exit", (code, signal) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] Watcher exited with code ${code} (Signal: ${signal}). Re-spawning instantly...\n`;
      fs.appendFileSync(logFile, logMessage, "utf8");
      
      // Prevent rapid fire crash loops by staggering slightly if crashing instantly
      setTimeout(spawnWatcher, 1000);
    });
  };

  spawnWatcher();
}
