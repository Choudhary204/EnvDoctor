/**
 * @file engine.js
 * @description Orchestration layer — coordinates scanner, validators, security
 * scanner, analyzers, and assembles the final DiagnosticReport.
 */

import { scan } from './scanner.js';
import { validateRequired } from '../validators/required.js';
import { validateTypes } from '../validators/types.js';
import { validateFormats } from '../validators/format.js';
import { detectWeakSecrets } from '../security/secrets.js';
import { checkGitTracking } from '../security/git-check.js';
import { detectDuplicates } from '../analyzers/duplicate.js';
import { detectUnused } from '../analyzers/unused.js';
import { compareEnvFiles } from '../analyzers/comparator.js';
import { computeHealthScore } from '../reporters/score.js';

/**
 * @typedef {Object} DiagnoseOptions
 * @property {string}   [filePath='.env']       - path to the primary .env file
 * @property {string}   [content]               - raw env content (skips file read)
 * @property {string[]} [required=[]]           - list of required variable names
 * @property {Object}   [rules={}]              - validation rules per variable
 * @property {boolean}  [checkGit=true]         - whether to check Git tracking
 * @property {boolean}  [detectUnusedVars=false]- whether to scan project files for unused vars
 * @property {string}   [projectRoot='.']       - root dir for unused-variable scan
 */

/**
 * @typedef {Object} DiagnosticReport
 * @property {string}   filePath
 * @property {number}   totalVars
 * @property {number}   passed
 * @property {number}   warnings
 * @property {number}   errors
 * @property {number}   healthScore       - 0–100
 * @property {string[]} keys
 * @property {Object[]} findings          - all findings from all checks
 * @property {Object[]} securityFindings
 * @property {string[]} suggestedFixes
 * @property {Object}   meta              - raw scan metadata
 */

/**
 * Runs the full EnvDoctor diagnostic pipeline and returns a structured report.
 *
 * @param {DiagnoseOptions} options
 * @returns {Promise<DiagnosticReport>}
 *
 * @example
 * const report = await diagnose({
 *   filePath: '.env',
 *   required: ['PORT', 'DATABASE_URL'],
 *   rules: { PORT: 'number', DATABASE_URL: 'url' },
 * });
 */
export async function diagnose(options = {}) {
  const {
    filePath = '.env',
    content,
    required = [],
    rules = {},
    checkGit = true,
    detectUnusedVars = false,
    projectRoot = '.',
  } = options;

  // ── 1. Scan ──────────────────────────────────────────────────────────────
  const scanResult = await scan({ filePath, content });
  const { _env: env, keys } = scanResult;

  const allFindings = [...scanResult.findings];

  // ── 2. Required variable check ───────────────────────────────────────────
  const requiredFindings = validateRequired(required, env, keys);
  allFindings.push(...requiredFindings);

  // ── 3. Type & format validation ──────────────────────────────────────────
  const typeFindings = validateTypes(rules, env);
  allFindings.push(...typeFindings);

  const formatFindings = validateFormats(rules, env);
  allFindings.push(...formatFindings);

  // ── 4. Security scan ─────────────────────────────────────────────────────
  const securityFindings = detectWeakSecrets(env, keys);
  allFindings.push(...securityFindings);

  let gitFindings = [];
  if (checkGit) {
    gitFindings = await checkGitTracking(scanResult.filePath);
    allFindings.push(...gitFindings);
  }

  // ── 5. Unused variable detection ─────────────────────────────────────────
  if (detectUnusedVars) {
    const unusedFindings = await detectUnused(keys, projectRoot);
    allFindings.push(...unusedFindings);
  }

  // ── 6. Aggregate ─────────────────────────────────────────────────────────
  const errors = allFindings.filter((f) => f.severity === 'error').length;
  const warnings = allFindings.filter((f) => f.severity === 'warning').length;
  const passed = allFindings.filter((f) => f.severity === 'pass').length;

  const { score, breakdown } = computeHealthScore({
    totalVars: scanResult.totalVars,
    errors,
    warnings,
    securityCount: securityFindings.length + gitFindings.length,
    required,
    requiredFindings,
  });

  const suggestedFixes = buildSuggestedFixes(allFindings);

  return {
    filePath: scanResult.filePath,
    totalVars: scanResult.totalVars,
    passed,
    warnings,
    errors,
    healthScore: score,
    scoreBreakdown: breakdown,
    keys,
    findings: allFindings,
    securityFindings: [...securityFindings, ...gitFindings],
    suggestedFixes,
    meta: {
      duplicates: scanResult.duplicates,
      requiredChecked: required.length,
      rulesChecked: Object.keys(rules).length,
    },
  };
}

/**
 * Builds a deduplicated list of human-readable suggested fixes.
 * @param {Object[]} findings
 * @returns {string[]}
 */
function buildSuggestedFixes(findings) {
  const fixes = new Set();
  for (const f of findings) {
    if (f.severity === 'error' || f.severity === 'warning') {
      if (f.code === 'MISSING_REQUIRED') {
        fixes.add(`Add ${f.key} to your environment file.`);
      } else if (f.code === 'EMPTY_VALUE') {
        fixes.add(`Provide a value for ${f.key}.`);
      } else if (f.code === 'INVALID_TYPE') {
        fixes.add(`Fix the value of ${f.key}: ${f.message}`);
      } else if (f.code === 'INVALID_FORMAT') {
        fixes.add(`Fix the format of ${f.key}: ${f.message}`);
      } else if (f.code === 'WEAK_SECRET') {
        fixes.add(`Replace the weak/placeholder value of ${f.key} with a strong secret.`);
      } else if (f.code === 'PLACEHOLDER_VALUE') {
        fixes.add(`Replace the placeholder value of ${f.key} with a real value.`);
      } else if (f.code === 'GIT_TRACKED') {
        fixes.add(`Add ${f.key || f.message.split(' ')[0]} to .gitignore and remove it from Git tracking.`);
      } else if (f.code === 'DUPLICATE_KEY') {
        fixes.add(`Remove the duplicate definition of ${f.key}.`);
      } else if (f.code === 'MALFORMED_LINE') {
        fixes.add(`Fix the malformed line at line ${f.line} in your .env file.`);
      } else if (f.message) {
        fixes.add(f.message);
      }
    }
  }
  return Array.from(fixes);
}

