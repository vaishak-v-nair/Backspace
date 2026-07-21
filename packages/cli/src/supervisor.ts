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
 * Spawns the daemon process detached into the background and records its PID.
 */
export function startSupervisedDaemon(cliEntryPointPath: string, cwd: string = process.cwd(), sessionId?: string) {
  const backspaceDir = getBackspaceDir(cwd);
  if (!fs.existsSync(backspaceDir)) {
    fs.mkdirSync(backspaceDir, { recursive: true, mode: 0o700 });
  }

  if (isDaemonRunning(cwd)) {
    console.log("⚠️ Backspace watcher daemon is already running in the background.");
    return;
  }

  console.log("🚀 Starting Backspace watcher daemon...");

  const logFile = path.join(backspaceDir, "daemon.log");
  const pidFile = path.join(backspaceDir, "daemon.pid");

  const isDev = cliEntryPointPath.endsWith('.ts');
  let execCmd = process.execPath;
  let execArgs = [cliEntryPointPath, "__daemon-worker"];

  if (isDev) {
    execCmd = 'npx';
    execArgs = ['tsx', cliEntryPointPath, "__daemon-worker"];
  }

  // Open log stream for tracking child process crashes (0o600 = owner-only read/write)
  const logStream = fs.openSync(logFile, "a", 0o600);

  const spawnOptions = {
    detached: true,
    cwd,
    stdio: ["ignore", logStream, logStream] as ["ignore", number, number],
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      ...(sessionId ? { BACKSPACE_SESSION_ID: sessionId } : {}),
    },
  };

  // No shell: passing args as an array handles paths with spaces natively AND
  // keeps the recorded PID pointing at the real node process. With shell:true
  // on Windows the PID belongs to the cmd.exe wrapper — `backspace-ai stop`
  // would kill the wrapper while the daemon lived on as an orphan.
  //
  // Exception: dev mode on Windows must go through a shell because `npx` is a
  // .cmd batch file. `stop` compensates by using `taskkill /T` (kills the
  // whole process tree) on Windows.
  const useShell = isDev && process.platform === 'win32';
  const child = useShell
    ? spawn(`"${execCmd}" ${execArgs.map(a => `"${a}"`).join(' ')}`, [], { ...spawnOptions, shell: true })
    : spawn(execCmd, execArgs, spawnOptions);

  if (child.pid) {
    // Write the verified PID immediately to disk (0o600 = owner-only)
    fs.writeFileSync(pidFile, child.pid.toString(), { encoding: "utf8", mode: 0o600 });
    console.log(`📡 Daemon detached into background. (PID: ${child.pid})`);
  } else {
    console.error("❌ Failed to start the background daemon process.");
  }

  // Unref allows the parent CLI execution to exit cleanly while the child continues living
  child.unref();
}
