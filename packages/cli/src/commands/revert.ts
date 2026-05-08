import prompts from 'prompts';
import * as Diff from 'diff';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { openDatabase, listSnapshots } from '../db.js';

function reversePatch(patch: any): any {
  return {
    ...patch,
    oldFileName: patch.newFileName,
    newFileName: patch.oldFileName,
    oldHeader: patch.newHeader,
    newHeader: patch.oldHeader,
    hunks: patch.hunks.map((hunk: any) => ({
      ...hunk,
      oldStart: hunk.newStart,
      oldLines: hunk.newLines,
      newStart: hunk.oldStart,
      newLines: hunk.oldLines,
      lines: hunk.lines.map((line: string) => {
        if (line.startsWith('+')) return '-' + line.substring(1);
        if (line.startsWith('-')) return '+' + line.substring(1);
        return line;
      }),
    })),
  };
}

export async function revertCommand() {
  const cwd = process.cwd();
  let db: ReturnType<typeof openDatabase>;

  try {
    db = openDatabase(cwd);
  } catch (err: any) {
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  const snapshots = listSnapshots(db).slice(0, 5);

  if (snapshots.length === 0) {
    console.log(chalk.yellow('No snapshots found in history.'));
    return;
  }

  const choices = snapshots.map((s) => ({
    title: `${s.timestamp.toLocaleString()} — ${s.prompt_context}`,
    value: s,
    description: `ID: ${s.id.substring(0, 8)} | ${s.file_paths.length} file(s) changed`,
  }));

  const response = await prompts({
    type: 'select',
    name: 'snapshot',
    message: 'Select a snapshot to revert',
    choices,
  });

  if (!response.snapshot) {
    console.log(chalk.dim('Revert cancelled.'));
    return;
  }

  const snapshot = response.snapshot;
  const diffData = snapshot.diff_data as Record<string, string>;

  console.log(chalk.blue(`\nReverting snapshot ${snapshot.id.substring(0, 8)}...`));

  let successCount = 0;
  let failureCount = 0;

  for (const [relativePath, patchStr] of Object.entries(diffData)) {
    const absolutePath = path.resolve(cwd, relativePath);
    const currentContent = fs.existsSync(absolutePath)
      ? fs.readFileSync(absolutePath, 'utf8')
      : '';

    // Parse the patch
    const parsedPatches = Diff.parsePatch(patchStr);
    
    // Reverse the hunks
    const reversedPatches = parsedPatches.map(reversePatch);

    // Apply the reverse patch
    const revertedContent = Diff.applyPatch(currentContent, reversedPatches as any);

    if (typeof revertedContent === 'string') {
      if (revertedContent === '' && !fs.existsSync(absolutePath) && reversedPatches.some(p => p.hunks.length > 0)) {
         // File was probably created by the AI and now reverted to empty state.
         // Wait, if it didn't exist, currentContent is ''. Apply patch gives ''.
         // Nothing to do if it's already deleted.
      } else if (revertedContent.trim() === '' && patchStr.includes('@@ -0,0')) {
        // If file was created from scratch, reverse diff yields empty. Let's delete it.
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(chalk.green(`  Deleted ${relativePath}`));
        }
      } else {
        // Write the reverted content
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, revertedContent, 'utf8');
        console.log(chalk.green(`  Reverted ${relativePath}`));
      }
      successCount++;
    } else {
      console.error(chalk.red(`  Failed to apply reverse patch to ${relativePath}`));
      failureCount++;
    }
  }

  if (failureCount === 0) {
    console.log(chalk.green.bold('\nSuccessfully reverted codebase to selected state.'));
  } else {
    console.log(
      chalk.yellow.bold(
        `\nRevert partially completed with ${failureCount} failure(s).`
      )
    );
  }
}
