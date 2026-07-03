/**
 * check.ts — Predictive protection command
 *
 * Analyzes a user's AI prompt BEFORE the session starts and warns about
 * likely failure patterns based on static keyword matching against a
 * known risk pattern table.
 *
 * Usage:
 *   backspace-ai check "refactor the auth module to use JWT"
 *   backspace-ai check "refactor the auth module" --force
 *
 * All analysis is local — no API calls. Check runs are logged to the
 * local SQLite database for future pattern data collection.
 */

import prompts from 'prompts';
import chalk from 'chalk';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import {
  RISK_PATTERNS,
  RISK_THRESHOLDS,
  HIGH_RISK_ACTIONS,
  MEDIUM_RISK_ACTIONS,
  HIGH_RISK_TARGETS,
  type RiskLevel,
  type RiskPattern,
} from '../patterns.js';
import { BACKSPACE_DIR, DB_FILENAME } from '../db.js';

// ─── Check log persistence ───────────────────────────────────────────────────

/**
 * Ensure the check_logs table exists in the local database.
 * Uses better-sqlite3 synchronously — consistent with the rest of the CLI.
 */
function ensureCheckLogTable(dbPath: string): void {

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS check_logs (
      id          TEXT PRIMARY KEY,
      prompt      TEXT NOT NULL,
      risk_level  TEXT NOT NULL,
      risk_score  INTEGER NOT NULL,
      patterns    TEXT NOT NULL,
      proceeded   INTEGER NOT NULL DEFAULT 0,
      checked_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.close();
}

/**
 * Log a check run to the local SQLite database.
 */
function logCheckRun(
  dbPath: string,
  prompt: string,
  riskLevel: RiskLevel,
  riskScore: number,
  matchedPatterns: string[],
  proceeded: boolean,
): void {

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const stmt = db.prepare(`
    INSERT INTO check_logs (id, prompt, risk_level, risk_score, patterns, proceeded)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    crypto.randomUUID(),
    prompt,
    riskLevel,
    riskScore,
    JSON.stringify(matchedPatterns),
    proceeded ? 1 : 0,
  );
  db.close();
}

// ─── Prompt analysis engine ──────────────────────────────────────────────────

interface AnalysisResult {
  riskLevel: RiskLevel;
  riskScore: number;
  matchedPatterns: Array<{
    pattern: RiskPattern;
    matchedAction: string;
    matchedTarget: string;
  }>;
  detectedActions: string[];
  detectedTargets: string[];
}

/**
 * Tokenize a prompt into lowercase words for keyword matching.
 */
function tokenize(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s/\\-_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Check if any keyword from a list appears in the tokenized prompt.
 * Returns the first matched keyword, or null.
 */
function findKeyword(tokens: string[], keywords: readonly string[]): string | null {
  for (const keyword of keywords) {
    // Support multi-word keywords and substring matching
    if (tokens.includes(keyword)) return keyword;
  }
  return null;
}

/**
 * Analyze a prompt against all known risk patterns.
 * Returns aggregated risk score, level, and all matched patterns.
 */
function analyzePrompt(prompt: string): AnalysisResult {
  const tokens = tokenize(prompt);
  const matchedPatterns: AnalysisResult['matchedPatterns'] = [];
  const detectedActions: string[] = [];
  const detectedTargets: string[] = [];
  const seenLabels = new Set<string>();

  // Detect which action and target keywords are present
  for (const action of [...HIGH_RISK_ACTIONS, ...MEDIUM_RISK_ACTIONS]) {
    if (tokens.includes(action)) {
      detectedActions.push(action);
    }
  }
  for (const target of HIGH_RISK_TARGETS) {
    if (tokens.includes(target)) {
      detectedTargets.push(target);
    }
  }

  // Match against the full pattern table
  for (const pattern of RISK_PATTERNS) {
    const matchedAction = findKeyword(tokens, pattern.actions);
    const matchedTarget = findKeyword(tokens, pattern.targets);

    if (matchedAction && matchedTarget && !seenLabels.has(pattern.label)) {
      seenLabels.add(pattern.label);
      matchedPatterns.push({ pattern, matchedAction, matchedTarget });
    }
  }

  // Calculate aggregate risk score
  const riskScore = matchedPatterns.reduce((sum, m) => sum + m.pattern.weight, 0);

  // Determine risk level from thresholds
  let riskLevel: RiskLevel;
  if (riskScore >= RISK_THRESHOLDS.HIGH) {
    riskLevel = 'HIGH';
  } else if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return { riskLevel, riskScore, matchedPatterns, detectedActions, detectedTargets };
}

// ─── Output formatting ───────────────────────────────────────────────────────

function formatRiskBadge(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return chalk.bgRed.white.bold(' HIGH RISK ');
    case 'MEDIUM':
      return chalk.bgYellow.black.bold(' MEDIUM RISK ');
    case 'LOW':
      return chalk.bgGreen.black.bold(' LOW RISK ');
  }
}

function printAnalysis(prompt: string, result: AnalysisResult): void {
  console.log();

  // ── Header ──────────────────────────────────────────────────────────────
  if (result.riskLevel === 'HIGH') {
    console.log(
      chalk.red('⚠') + ' ' +
      formatRiskBadge(result.riskLevel) + ' ' +
      chalk.red('prompt detected') +
      (result.matchedPatterns.length > 0
        ? chalk.dim(` (${result.matchedPatterns.map(m => m.pattern.label).join(', ')})`)
        : '')
    );
  } else if (result.riskLevel === 'MEDIUM') {
    console.log(
      chalk.yellow('⚠') + ' ' +
      formatRiskBadge(result.riskLevel) + ' ' +
      chalk.yellow('prompt detected') +
      (result.matchedPatterns.length > 0
        ? chalk.dim(` (${result.matchedPatterns.map(m => m.pattern.label).join(', ')})`)
        : '')
    );
  } else {
    console.log(
      chalk.green('✓') + ' ' +
      formatRiskBadge(result.riskLevel) + ' ' +
      chalk.green('— no known risky patterns detected')
    );
    console.log(chalk.dim('  Prompt appears safe. Proceed with your AI session.'));
    console.log();
    return;
  }

  // ── Failure patterns ────────────────────────────────────────────────────
  if (result.matchedPatterns.length > 0) {
    console.log();
    console.log(chalk.white.bold('Common failure patterns for this type of change:'));

    // Deduplicate failures across matched patterns
    const allFailures: string[] = [];
    for (const match of result.matchedPatterns) {
      for (const failure of match.pattern.failures) {
        if (!allFailures.includes(failure)) {
          allFailures.push(failure);
        }
      }
    }
    // Show at most 4 failures to keep output concise
    for (const failure of allFailures.slice(0, 4)) {
      console.log(chalk.red('  - ') + chalk.dim(failure));
    }
  }

  // ── Suggested constraints ───────────────────────────────────────────────
  const allConstraints: string[] = [];
  for (const match of result.matchedPatterns) {
    for (const constraint of match.pattern.constraints) {
      if (!allConstraints.includes(constraint)) {
        allConstraints.push(constraint);
      }
    }
  }

  if (allConstraints.length > 0) {
    console.log();
    console.log(chalk.white.bold('Suggested constraints to add to your prompt:'));
    // Show at most 3 constraints to keep output actionable
    for (const constraint of allConstraints.slice(0, 3)) {
      console.log(chalk.cyan('  → ') + chalk.white(constraint));
    }
  }

  console.log();
}

// ─── Command handler ─────────────────────────────────────────────────────────

export async function checkCommand(
  prompt: string,
  options: { force?: boolean } = {},
): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    console.error(chalk.red('Error: Please provide a prompt to analyze.'));
    console.error(chalk.dim('Usage: backspace-ai check "your AI prompt here"'));
    return;
  }

  // Resolve the database path
  const cwd = process.cwd();
  const dbPath = path.join(cwd, BACKSPACE_DIR, DB_FILENAME);

  // Ensure check_logs table exists (creates DB if needed)
  const dbDir = path.join(cwd, BACKSPACE_DIR);
  if (fs.existsSync(dbDir)) {
    ensureCheckLogTable(dbPath);
  }

  // Run analysis
  const result = analyzePrompt(prompt);

  // Print the analysis
  printAnalysis(prompt, result);

  // Log to database (if .backspace directory exists)
  const patternLabels = result.matchedPatterns.map(m => m.pattern.label);

  if (result.riskLevel === 'LOW') {
    // Low risk — log and proceed without confirmation
    if (fs.existsSync(dbDir)) {
      logCheckRun(dbPath, prompt, result.riskLevel, result.riskScore, patternLabels, true);
    }
    return;
  }

  // HIGH or MEDIUM risk — ask for confirmation unless --force
  if (options.force) {
    console.log(chalk.dim('  --force flag set. Skipping confirmation.'));
    console.log();
    if (fs.existsSync(dbDir)) {
      logCheckRun(dbPath, prompt, result.riskLevel, result.riskScore, patternLabels, true);
    }
    return;
  }

  const confirm = await prompts({
    type: 'confirm',
    name: 'proceed',
    message: 'Proceed with this prompt anyway?',
    initial: false,
  });

  // Log the result
  if (fs.existsSync(dbDir)) {
    logCheckRun(dbPath, prompt, result.riskLevel, result.riskScore, patternLabels, !!confirm.proceed);
  }

  if (confirm.proceed) {
    console.log(chalk.dim('\n  Proceeding. Run `backspace-ai watch` to protect your session.\n'));
  } else {
    console.log(chalk.dim('\n  Cancelled. Consider adding the suggested constraints to your prompt.\n'));
  }
}
