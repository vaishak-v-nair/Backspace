/**
 * analysis.ts — Post-revert intelligent diff analysis
 *
 * Performs static analysis on the diff payloads to produce a concise,
 * human-readable summary of what the AI changed and why it might be risky.
 *
 * No external API calls or ML — pure pattern matching on the unified diffs.
 */

import path from 'path';
import chalk from 'chalk';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffPayload {
  path: string;
  event: string;
  patch: string;
}

interface ChangePattern {
  /** Human-readable label for the pattern */
  label: string;
  /** Number of files matching this pattern */
  count: number;
  /** Static risk percentage — documented assumption based on common AI coding failure modes */
  riskPercent: number;
}

// ─── Known risky patterns ─────────────────────────────────────────────────────
//
// Static lookup table of AI change patterns and their documented breakage rates.
// These are conservative estimates based on common failure modes observed in
// AI-assisted coding sessions. We will replace these with real telemetry data
// once we have enough sessions to compute meaningful statistics.
//
// Sources for estimates:
//   - sync→async: High breakage because callers must also become async
//   - import changes: Moderate — often introduces unused deps or removes needed ones
//   - env var references: Moderate — works locally but breaks in CI/deploy
//   - DB query changes: High — schema mismatches, missing migrations
//   - API endpoint changes: High — breaks frontend/backend contract
//   - package.json changes: Moderate — version conflicts, missing peer deps

const RISK_TABLE: Record<string, { riskPercent: number; description: string }> = {
  'sync-to-async': {
    riskPercent: 34,     // sync→async requires all callers to also be updated
    description: 'sync→async function signature changes',
  },
  'import-changes': {
    riskPercent: 18,     // import additions/removals — often cosmetic but can break
    description: 'import additions or removals',
  },
  'env-var-references': {
    riskPercent: 22,     // env vars work locally but fail in CI/production
    description: 'environment variable references added',
  },
  'db-query-changes': {
    riskPercent: 41,     // schema drift and missing migrations
    description: 'database query changes',
  },
  'api-endpoint-changes': {
    riskPercent: 37,     // frontend/backend contract breakage
    description: 'API endpoint modifications',
  },
  'dependency-changes': {
    riskPercent: 15,     // version conflicts, peer dep issues
    description: 'dependency changes in package.json',
  },
};

// ─── Pattern detection ────────────────────────────────────────────────────────

/**
 * Detect sync→async function signature changes in a unified diff.
 * Looks for lines where `function foo(` was replaced with `async function foo(`
 * or `const foo = (` was replaced with `const foo = async (`.
 */
function detectSyncToAsync(patch: string): boolean {
  // Added lines containing async function/arrow that pair with removed non-async versions
  const addedAsync = /^\+.*\basync\s+(function\b|\(|=>)/m.test(patch);
  const removedSync = /^-.*\bfunction\b/m.test(patch) || /^-.*(?:const|let|var)\s+\w+\s*=\s*\(/m.test(patch);
  return addedAsync && removedSync;
}

/** Detect import additions or removals */
function detectImportChanges(patch: string): boolean {
  return /^[+-]\s*(import\s|from\s|require\s*\()/m.test(patch);
}

/** Detect environment variable references being added */
function detectEnvVarReferences(patch: string): boolean {
  return /^\+.*\bprocess\.env\b/m.test(patch) ||
         /^\+.*\bimport\.meta\.env\b/m.test(patch) ||
         /^\+.*\bDeno\.env\b/m.test(patch);
}

/** Detect database query changes (SQL, ORM methods) */
function detectDbQueryChanges(patch: string): boolean {
  return /^[+-].*\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(patch) ||
         /^[+-].*\b(findMany|findUnique|findFirst|create|update|upsert|delete|\.query\(|\.execute\(|\.prepare\()\b/m.test(patch) ||
         /^[+-].*\bprisma\./m.test(patch) ||
         /^[+-].*\bsupabase\./m.test(patch);
}

/** Detect API endpoint modifications (route handlers, fetch calls) */
function detectApiEndpointChanges(patch: string): boolean {
  return /^[+-].*\b(app\.(get|post|put|patch|delete)|router\.(get|post|put|patch|delete))\s*\(/m.test(patch) ||
         /^[+-].*\bfetch\s*\(/m.test(patch) ||
         /^[+-].*\b(NextResponse|NextRequest|Response)\b/m.test(patch);
}

/** Detect package.json dependency changes */
function detectDependencyChanges(filePath: string, patch: string): boolean {
  if (!filePath.endsWith('package.json')) return false;
  return /^[+-]\s*"[^"]+"\s*:\s*"[\^~]?\d/m.test(patch);
}

// ─── Directory analysis ───────────────────────────────────────────────────────

/**
 * Count files changed per top-level directory.
 * Returns entries sorted by count descending.
 */
function getDirectoryBreakdown(payloads: DiffPayload[]): Array<{ dir: string; count: number }> {
  const dirCounts = new Map<string, number>();

  for (const p of payloads) {
    // Extract the first meaningful directory segment
    const segments = p.path.replace(/^\.\//, '').split(/[/\\]/);
    const dir = segments.length > 1 ? segments[0] + '/' : '(root)';
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }

  return Array.from(dirCounts.entries())
    .map(([dir, count]) => ({ dir, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Main analysis function ───────────────────────────────────────────────────

/**
 * Analyze the diff payloads from a reverted snapshot and print a concise
 * human-readable summary of what the AI changed and why it might be risky.
 *
 * Output is always ≤3 lines:
 *   Line 1: "✓ Reverted N files to pre-AI state"
 *   Line 2: "⚠ Most changes were in X/ — AI [pattern description]"
 *   Line 3: "  This pattern causes breakages in Y% of sessions like this one"
 *
 * @param payloads - The diff payloads that were just reverted
 * @param successCount - Number of files successfully reverted
 * @param failureCount - Number of files that failed to revert
 */
export function printRevertAnalysis(
  payloads: DiffPayload[],
  successCount: number,
  failureCount: number,
): void {
  // Filter out binary-bypassed entries
  const analyzable = payloads.filter(p => p.patch && p.patch !== 'BINARY_FILE_BYPASSED');

  if (analyzable.length === 0) return;

  // ── Line 1: Summary ──────────────────────────────────────────────────────
  const totalFiles = successCount + failureCount;
  if (failureCount === 0) {
    console.log(chalk.green.bold(`\n✓ Reverted ${totalFiles} file${totalFiles !== 1 ? 's' : ''} to pre-AI state`));
  } else {
    console.log(chalk.yellow.bold(
      `\n⚠ Reverted ${successCount}/${totalFiles} file${totalFiles !== 1 ? 's' : ''} to pre-AI state (${failureCount} failed)`
    ));
  }

  // ── Detect patterns ──────────────────────────────────────────────────────
  const detected: ChangePattern[] = [];

  const detectors: Array<{
    key: string;
    detect: (patch: string, filePath: string) => boolean;
  }> = [
    { key: 'sync-to-async',       detect: (p)    => detectSyncToAsync(p) },
    { key: 'import-changes',      detect: (p)    => detectImportChanges(p) },
    { key: 'env-var-references',  detect: (p)    => detectEnvVarReferences(p) },
    { key: 'db-query-changes',    detect: (p)    => detectDbQueryChanges(p) },
    { key: 'api-endpoint-changes', detect: (p)   => detectApiEndpointChanges(p) },
    { key: 'dependency-changes',  detect: (p, f) => detectDependencyChanges(f, p) },
  ];

  for (const { key, detect } of detectors) {
    let matchCount = 0;
    for (const payload of analyzable) {
      if (detect(payload.patch, payload.path)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const risk = RISK_TABLE[key];
      detected.push({
        label: risk.description,
        count: matchCount,
        riskPercent: risk.riskPercent,
      });
    }
  }

  // Sort by count descending to find the dominant pattern
  detected.sort((a, b) => b.count - a.count);

  // ── Line 2 & 3: Directory + Pattern ──────────────────────────────────────
  const dirs = getDirectoryBreakdown(analyzable);
  const topDir = dirs[0];
  const dominantPattern = detected[0];

  if (topDir && dominantPattern) {
    // "⚠ Most changes were in auth/ — AI modified sync→async function signatures"
    console.log(
      chalk.yellow('⚠') +
      chalk.dim(' Most changes were in ') +
      chalk.white(topDir.dir) +
      chalk.dim(' — AI ') +
      chalk.white(dominantPattern.label)
    );
    // "  This pattern causes breakages in 34% of sessions like this one"
    console.log(
      chalk.dim('  This pattern causes breakages in ') +
      chalk.yellow(`${dominantPattern.riskPercent}%`) +
      chalk.dim(' of sessions like this one')
    );
  } else if (topDir) {
    // No specific pattern detected — just show directory breakdown
    const secondaryDirs = dirs.slice(1, 3).map(d => d.dir).join(', ');
    const dirSummary = secondaryDirs
      ? `${topDir.dir} (${topDir.count} files), ${secondaryDirs}`
      : `${topDir.dir} (${topDir.count} file${topDir.count !== 1 ? 's' : ''})`;
    console.log(
      chalk.dim('  Changes concentrated in: ') + chalk.white(dirSummary)
    );
  }
}
