/**
 * @file required.js
 * @description Validates that all required environment variables are present and non-empty.
 */

/**
 * @param {string[]} required   - list of required variable names
 * @param {Object}   env        - parsed env key→value map
 * @param {string[]} keys       - all keys found in the file
 * @returns {import('../core/scanner.js').ScanFinding[]}
 */
export function validateRequired(required, env, keys) {
  const findings = [];

  for (const key of required) {
    if (!(key in env)) {
      findings.push({
        severity: 'error',
        code: 'MISSING_REQUIRED',
        key,
        message: `${key} is required but not defined in the environment file`,
      });
    } else if (env[key] === '' || env[key] == null) {
      findings.push({
        severity: 'error',
        code: 'MISSING_REQUIRED',
        key,
        message: `${key} is required but has an empty value`,
      });
    } else {
      findings.push({
        severity: 'pass',
        code: 'REQUIRED_PRESENT',
        key,
        message: `${key} is present`,
      });
    }
  }

  return findings;
}

