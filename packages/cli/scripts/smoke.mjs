/**
 * scripts/smoke.mjs — end-to-end smoke test of the core recovery promise.
 *
 * Exercises the full lifecycle against the BUILT CLI (dist/index.js):
 *   init → watch → AI-style edit → stop → revert
 * and asserts the file is restored to its pre-edit content — the exact
 * scenario where an unseeded diff baseline used to wipe files to empty.
 *
 * Run with `npm run smoke` (after `npm run build`). Exits non-zero on failure.
 */

import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '..', 'dist', 'index.js');

if (!fs.existsSync(CLI)) {
  console.error('smoke: dist/index.js not found — run `npm run build` first.');
  process.exit(1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backspace-smoke-'));
const ORIGINAL = 'line1\nline2\nline3\n';

const sh = (cmd, args) =>
  execFileSync(cmd, args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const cli = (...args) => sh(process.execPath, [CLI, ...args]);

let failed = false;
try {
  // Arrange: a git repo with a committed file (the Git Bridge baseline source)
  sh('git', ['init', '-q']);
  sh('git', ['-c', 'user.email=smoke@backspace.test', '-c', 'user.name=smoke', 'checkout', '-b', 'main']);
  fs.writeFileSync(path.join(dir, 'a.txt'), ORIGINAL);
  sh('git', ['add', '.']);
  sh('git', ['-c', 'user.email=smoke@backspace.test', '-c', 'user.name=smoke', 'commit', '-qm', 'init']);

  cli('init');
  cli('watch', '--prompt', 'smoke test');
  await sleep(4000); // let the daemon and its watcher come up

  // Act: simulate an AI edit to a file the daemon has never cached
  fs.appendFileSync(path.join(dir, 'a.txt'), 'EVIL AI LINE\n');
  await sleep(4000); // debounce (250ms) + write settle, with CI margin

  cli('stop');
  const revertOut = cli('revert', '--latest', '--quiet');
  console.log(revertOut.trim());

  // Assert: revert restored the original content — not an empty file
  const final = fs.readFileSync(path.join(dir, 'a.txt'), 'utf8');
  if (final !== ORIGINAL) {
    console.error('smoke: FAIL — file content after revert does not match original.');
    console.error(`expected:\n${JSON.stringify(ORIGINAL)}\ngot:\n${JSON.stringify(final)}`);
    failed = true;
  } else {
    console.log('smoke: PASS — session reverted, file restored to pre-AI state.');
  }
} catch (err) {
  console.error('smoke: FAIL —', err instanceof Error ? err.message : err);
  if (err && err.stderr) console.error(String(err.stderr));
  failed = true;
} finally {
  // Best-effort cleanup: make sure no daemon outlives the test
  try { cli('stop'); } catch { /* already stopped */ }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* windows file locks */ }
}

process.exit(failed ? 1 : 0);
