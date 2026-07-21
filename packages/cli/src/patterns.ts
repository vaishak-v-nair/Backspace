/**
 * patterns.ts — Extensible risk pattern table for prompt analysis
 *
 * This module defines all known risky (action + target) combinations that
 * AI coding agents commonly get wrong. Each entry includes:
 *   - Common failure patterns for that combination
 *   - Suggested constraints the user can prepend to their AI prompt
 *   - A risk weight (higher = more dangerous)
 *
 * To add new patterns: append to RISK_PATTERNS below. No other code changes needed.
 */

// ─── Risk level thresholds ────────────────────────────────────────────────────
//
// Final risk score = sum of matched pattern weights.
//   HIGH:   score >= 4
//   MEDIUM: score >= 2
//   LOW:    score < 2

export const RISK_THRESHOLDS = {
  HIGH: 4,     // A single high-weight pattern (auth, db, security) is enough
  MEDIUM: 2,   // At least one moderate pattern match
} as const;

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// ─── Keyword categories ──────────────────────────────────────────────────────

/** Action verbs that signal destructive or large-scope changes */
export const HIGH_RISK_ACTIONS = [
  'refactor', 'rewrite', 'migrate', 'restructure', 'rename',
  'delete', 'remove', 'replace', 'convert', 'overhaul',
] as const;

/** Action verbs that signal moderate changes */
export const MEDIUM_RISK_ACTIONS = [
  'update', 'modify', 'change', 'fix', 'adjust', 'add', 'implement',
] as const;

/** Targets (modules/areas) that are inherently fragile */
export const HIGH_RISK_TARGETS = [
  'auth', 'authentication', 'database', 'db', 'schema', 'middleware',
  'config', 'configuration', 'env', 'environment', 'api', 'routes',
  'routing', 'models', 'migration', 'security', 'session', 'sessions',
  'jwt', 'oauth', 'token', 'tokens', 'password', 'permissions',
  'rbac', 'cors', 'ssl', 'tls', 'certificate',
] as const;

// ─── Risk pattern entries ─────────────────────────────────────────────────────

export interface RiskPattern {
  /** Action keywords that trigger this pattern (matched case-insensitively) */
  actions: readonly string[];
  /** Target keywords that trigger this pattern (matched case-insensitively) */
  targets: readonly string[];
  /** Risk weight added when this pattern matches (higher = riskier) */
  weight: number;
  /** Human-readable label shown in output */
  label: string;
  /** Failure modes commonly observed with this pattern */
  failures: string[];
  /** Suggested constraints the user can add to their AI prompt */
  constraints: string[];
}

/**
 * Master risk pattern table.
 *
 * Each entry is a known (action × target) combination with documented failure
 * modes. The engine matches a user's prompt against ALL entries and aggregates
 * the results. Order does not matter.
 */
export const RISK_PATTERNS: RiskPattern[] = [
  // ── Auth + destructive actions ────────────────────────────────────────────
  {
    actions: ['refactor', 'rewrite', 'migrate', 'convert', 'replace'],
    targets: ['auth', 'authentication', 'session', 'sessions', 'jwt', 'oauth', 'token'],
    weight: 4,
    label: 'auth modification',
    failures: [
      'Async signature changes break downstream API consumers',
      'Session middleware may conflict with new auth middleware',
      'Cookie configuration often gets reset or misconfigured',
      'Token expiry and refresh logic frequently gets dropped',
    ],
    constraints: [
      '"Do not change function signatures in auth/middleware.js"',
      '"Keep existing session fallback until new auth is fully tested"',
      '"Preserve all cookie configuration values exactly as they are"',
    ],
  },

  // ── Database / schema changes ─────────────────────────────────────────────
  {
    actions: ['refactor', 'rewrite', 'migrate', 'restructure', 'rename', 'convert'],
    targets: ['database', 'db', 'schema', 'models', 'migration'],
    weight: 5,
    label: 'database schema change',
    failures: [
      'Foreign key constraints silently dropped during restructure',
      'Index definitions lost, causing query performance regression',
      'Migration files generated in wrong order, breaking deploy pipeline',
      'Enum values changed without updating application-level validation',
    ],
    constraints: [
      '"Generate a reversible migration file, do not modify existing migrations"',
      '"Preserve all existing indexes and foreign key constraints"',
      '"Do not rename columns — add new ones and deprecate old ones"',
    ],
  },

  // ── API / routes changes ──────────────────────────────────────────────────
  {
    actions: ['refactor', 'rewrite', 'restructure', 'rename', 'replace'],
    targets: ['api', 'routes', 'routing', 'endpoint', 'endpoints'],
    weight: 4,
    label: 'API endpoint modification',
    failures: [
      'Route path changes break existing frontend fetch calls',
      'Request/response type contracts silently altered',
      'Error handling middleware chain gets reordered incorrectly',
      'CORS configuration dropped when routes are reorganized',
    ],
    constraints: [
      '"Do not change any existing route paths — only add new ones"',
      '"Preserve the exact request and response types for all endpoints"',
      '"Keep all error handling middleware in its current position"',
    ],
  },

  // ── Middleware changes ────────────────────────────────────────────────────
  {
    actions: ['refactor', 'rewrite', 'modify', 'update', 'change', 'replace'],
    targets: ['middleware', 'cors', 'security'],
    weight: 3,
    label: 'middleware modification',
    failures: [
      'Middleware execution order changed, breaking auth chain',
      'CORS headers removed or misconfigured for specific origins',
      'Rate limiting configuration reset to defaults',
    ],
    constraints: [
      '"Do not change the order of middleware in the stack"',
      '"Preserve all existing CORS origin configurations"',
    ],
  },

  // ── Config / env changes ──────────────────────────────────────────────────
  {
    actions: ['refactor', 'rewrite', 'update', 'modify', 'change', 'replace', 'migrate'],
    targets: ['config', 'configuration', 'env', 'environment'],
    weight: 3,
    label: 'configuration change',
    failures: [
      'Environment variable names changed without updating deployment config',
      'Default values added that mask missing production variables',
      'Config file format changed (e.g. .js → .ts) breaking existing tooling',
    ],
    constraints: [
      '"Do not rename any existing environment variables"',
      '"Do not add default values for secrets — throw if missing"',
      '"Keep the config file format unchanged"',
    ],
  },

  // ── Security-sensitive operations ─────────────────────────────────────────
  {
    actions: ['refactor', 'rewrite', 'update', 'modify', 'remove', 'delete', 'replace'],
    targets: ['password', 'permissions', 'rbac', 'ssl', 'tls', 'certificate', 'security'],
    weight: 5,
    label: 'security-sensitive change',
    failures: [
      'Password hashing algorithm changed without re-hashing existing passwords',
      'Permission checks removed during refactor, creating privilege escalation',
      'TLS configuration downgraded or certificate validation disabled',
    ],
    constraints: [
      '"Do not change the password hashing algorithm or salt rounds"',
      '"Preserve all existing permission and role checks"',
      '"Do not modify TLS/SSL configuration"',
    ],
  },

  // ── General destructive actions on any target ─────────────────────────────
  {
    actions: ['delete', 'remove'],
    targets: ['auth', 'database', 'db', 'api', 'config', 'middleware', 'security'],
    weight: 5,
    label: 'destructive operation on critical module',
    failures: [
      'Critical module deleted without updating all dependents',
      'Import references left dangling, causing build failures',
      'Fallback behavior removed that downstream code relied on',
    ],
    constraints: [
      '"Do not delete any files — only deprecate with clear TODO comments"',
      '"Verify all imports still resolve after any file removal"',
    ],
  },

  // ── Rename / restructure (file-level) ─────────────────────────────────────
  {
    actions: ['rename', 'restructure', 'reorganize'],
    targets: ['auth', 'api', 'routes', 'models', 'database', 'db', 'config'],
    weight: 3,
    label: 'file/directory restructure',
    failures: [
      'Import paths broken across dozens of files simultaneously',
      'Build tool path aliases not updated to match new structure',
      'Test file paths and fixtures no longer resolve',
    ],
    constraints: [
      '"Update all import paths after any file rename"',
      '"Update tsconfig paths and build tool aliases"',
      '"Verify all tests still pass after restructure"',
    ],
  },
];
