import prompts from 'prompts';
import * as diff from 'diff';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { LocalDB, BACKSPACE_DIR, DB_FILENAME } from '../db.js';
import { decryptData } from '../crypto.js';

export async function revertCommand() {
  const cwd = process.cwd();
  const dbPath = path.join(cwd, BACKSPACE_DIR, DB_FILENAME);
  const db = new LocalDB(dbPath);

  // 1. Query the 10 most recent snapshots
  const snapshots = db.getRecentSnapshots(10);

  if (snapshots.length === 0) {
    console.log(chalk.yellow('No snapshots found in history.'));
    return;
  }

  const choices = snapshots.map((s: any) => ({
    title: `${new Date(s.timestamp).toLocaleString()} — ${s.prompt || 'Auto-capture'}`,
    value: s.id,
    description: `ID: ${s.id} | Files changed: ${s.files_changed}`,
  }));

  // Interactive UI
  const response = await prompts({
    type: 'select',
    name: 'snapshotId',
    message: 'Select a snapshot to revert to the state BEFORE it was applied',
    choices,
  });

  if (!response.snapshotId) {
    console.log(chalk.dim('Revert cancelled.'));
    return;
  }

  // 2. Fetch the detailed payload
  const snapshot = db.getSnapshotById(response.snapshotId);
  const rawPayload = JSON.parse(snapshot.diff_payload);
  
  let diffPayloads;
  if (rawPayload.cipher_payload) {
    const decryptedStr = decryptData(rawPayload.cipher_payload, rawPayload.crypto_iv, rawPayload.crypto_tag, cwd);
    diffPayloads = JSON.parse(decryptedStr);
  } else {
    diffPayloads = rawPayload;
  }

  console.log(chalk.blue(`\nAnalyzing snapshot ${snapshot.id}...`));

  let safetyWarning = false;
  
  // 5. Safety Validation Check (Dry Run)
  for (const payload of diffPayloads) {
    if (payload.patch === "BINARY_FILE_BYPASSED") continue;
    
    const absolutePath = path.resolve(cwd, payload.path);
    const fileExists = fs.existsSync(absolutePath);
    let currentDiskContent = fileExists ? fs.readFileSync(absolutePath, 'utf8') : '';

    if (fileExists && currentDiskContent.length === 0 && payload.event !== 'unlink') {
      safetyWarning = true;
    }

    if (fileExists && payload.event === 'change') {
      const parsedPatches = diff.parsePatch(payload.patch);
      const reversedPatches = diff.reversePatch(parsedPatches);
      const revertedContent = diff.applyPatch(currentDiskContent, reversedPatches as any);
      if (typeof revertedContent !== 'string') {
        safetyWarning = true; // Patch rejected in dry run
      }
    }
  }

  if (safetyWarning) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: chalk.red('Warning: Some files have been modified since this snapshot. Override them anyway?'),
      initial: false
    });
    if (!confirm.proceed) {
      console.log(chalk.dim('Revert cancelled.'));
      return;
    }
  }

  let successCount = 0;
  let failureCount = 0;

  // The 3 Paths of Inverse Patching
  for (const payload of diffPayloads) {
    const absolutePath = path.resolve(cwd, payload.path);
    const fileExists = fs.existsSync(absolutePath);

    // Path 1: The AI Created a New File (Operation: add)
    if (payload.event === 'add' || payload.event === 'addDir') {
      if (payload.patch === "BINARY_FILE_BYPASSED") continue;
      if (fileExists) {
        fs.unlinkSync(absolutePath);
        console.log(chalk.green(`  🗑️ Deleted new file ${payload.path}`));
        successCount++;
      }
      continue;
    }

    // Path 2: The AI Deleted a File (Operation: delete/unlink)
    if (payload.event === 'unlink' || payload.event === 'unlinkDir') {
      if (payload.patch === "BINARY_FILE_BYPASSED") continue;
      // payload.patch now contains the original entire text
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, payload.patch, 'utf8');
      console.log(chalk.green(`  📝 Recreated deleted file ${payload.path}`));
      successCount++;
      continue;
    }

    // Path 3: The AI Modified an Existing File (Operation: change)
    if (fileExists) {
      if (payload.patch === "BINARY_FILE_BYPASSED") continue;
      const currentDiskContent = fs.readFileSync(absolutePath, 'utf8');
      
      const parsedPatches = diff.parsePatch(payload.patch);
      const reversedPatches = diff.reversePatch(parsedPatches);
      
      const revertedContent = diff.applyPatch(currentDiskContent, reversedPatches as any);

      if (typeof revertedContent === 'string') {
        fs.writeFileSync(absolutePath, revertedContent, 'utf8');
        console.log(chalk.green(`  ↩️ Reverted changes in ${payload.path}`));
        successCount++;
      } else {
        console.error(chalk.red(`  ❌ Hunk rejection on ${payload.path} - modifications exist`));
        failureCount++;
      }
    } else {
      console.error(chalk.red(`  ❌ Cannot revert ${payload.path} because it was deleted manually`));
      failureCount++;
    }
  }

  if (failureCount === 0) {
    console.log(chalk.green.bold('\n✨ Successfully reverted codebase to selected state.'));
  } else {
    console.log(chalk.yellow.bold(`\n⚠️ Revert partially completed with ${failureCount} failure(s).`));
  }
}
