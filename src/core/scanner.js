/**
 * @file scanner.js
 * @description Scans a parsed .env result and returns structured findings:
 * missing variables, empty values, malformed lines, and metadata.
 * Never exposes secret values in its output.
 */

import { parseEnvFile, parseEnvContent } from './parser.js';

/**
 * @typedef {Object} ScanFinding
 * @property {'error'|'warning'|'info'|'pass'} severity
 * @property {string} code    - machine-readable code, e.g. 'MISSING_VALUE'
 * @property {string} key     - affected variable name (may be empty for file-level issues)
 * @property {number} [line]  - 1-based line number if applicable
 * @property {string} message - human-readable description
 */

/**
 * @typedef {Object} ScanResult
 * @property {string}         filePath
 * @property {ScanFinding[]}  findings
 * @property {string[]}       keys       - all variable keys found
 * @property {number}         totalVars
 * @property {Object}         _env       - internal env map; treat as opaque — do NOT log values
 */

/** Keys whose values are considered sensitive and should never be revealed */
const SENSITIVE_KEY_PATTERNS = [
  /secret/i,
  /password/i,
  /passwd/i,
  /api[_-]?key/i,
  /token/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /cert/i,
  /jwt/i,
  /access[_-]?key/i,
];

/**
 * Returns true if a key name looks sensitive.
 * @param {string} key
 * @returns {boolean}
 */
export function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Returns a redacted display string for a value — never the real value.
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
export function redactValue(key, value) {
  if (isSensitiveKey(key)) return '[REDACTED]';
  if (value.length === 0) return '(empty)';
  if (value.length <= 4) return '[***]';
  return value.slice(0, 2) + '*'.repeat(Math.min(value.length - 2, 8));
}

/**
 * Scans already-parsed env entries for surface-level issues.
 * @param {import('./parser.js').ParseResult} parseResult
 * @returns {ScanFinding[]}
 */
function scanEntries(parseResult) {
  const { entries, duplicates } = parseResult;
  const findings = [];

  for (const entry of entries) {
    if (entry.type === 'malformed') {
      findings.push({
        severity: 'error',
        code: 'MALFORMED_LINE',
        key: '',
        line: entry.line,
        message: `Line ${entry.line} is malformed and cannot be parsed: "${entry.text.slice(0, 60)}"`,
      });
      continue;
    }

    if (entry.type !== 'variable') continue;

    const { key, value, line } = entry;

    if (value === '' || value === null || value === undefined) {
      findings.push({
        severity: 'warning',
        code: 'EMPTY_VALUE',
        key,
        line,
        message: `${key} is defined but has an empty value`,
      });
    }
  }

  // Duplicate keys
  for (const key of duplicates) {
    const lines = entries
      .filter((e) => e.type === 'variable' && e.key === key)
      .map((e) => e.line)
      .join(', ');
    findings.push({
      severity: 'error',
      code: 'DUPLICATE_KEY',
      key,
      message: `${key} is defined more than once (lines: ${lines}). Only the last value is used.`,
    });
  }

  return findings;
}

/**
 * Scans a .env file and returns a ScanResult.
 * @param {Object} options
 * @param {string} [options.filePath='.env'] - path to the env file
 * @param {string} [options.content]          - raw content (skips file read when provided)
 * @returns {Promise<ScanResult>}
 */
export async function scan({ filePath = '.env', content } = {}) {
  let parseResult;

  if (content !== undefined) {
    parseResult = parseEnvContent(content, filePath);
  } else {
    parseResult = await parseEnvFile(filePath);
  }

  const { entries, env, duplicates } = parseResult;
  const keys = entries.filter((e) => e.type === 'variable').map((e) => e.key);
  const findings = scanEntries(parseResult);

  return {
    filePath: parseResult.filePath,
    findings,
    keys,
    duplicates,
    totalVars: keys.length,
    _env: env, // internal — callers should not log this
  };
}

