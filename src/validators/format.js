/**
 * @file format.js
 * @description Validates format constraints: minLength, maxLength, pattern, enum.
 */

/**
 * @param {Object} rules - { VAR_NAME: { minLength?, maxLength?, pattern?, enum? } }
 * @param {Object} env   - parsed key→value map
 * @returns {import('../core/scanner.js').ScanFinding[]}
 */
export function validateFormats(rules, env) {
  const findings = [];

  for (const [key, rule] of Object.entries(rules)) {
    if (typeof rule !== 'object' || rule === null) continue;
    if (!(key in env) || env[key] === '' || env[key] == null) continue;

    const value = env[key];
    const { minLength, maxLength, pattern, enum: allowedValues } = rule;

    if (minLength !== undefined && value.length < minLength) {
      findings.push({
        severity: 'error',
        code: 'INVALID_FORMAT',
        key,
        message: `${key} must be at least ${minLength} characters long (got ${value.length}).`,
      });
      continue;
    }

    if (maxLength !== undefined && value.length > maxLength) {
      findings.push({
        severity: 'error',
        code: 'INVALID_FORMAT',
        key,
        message: `${key} must be at most ${maxLength} characters long (got ${value.length}).`,
      });
      continue;
    }

    if (pattern !== undefined) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (!re.test(value)) {
        findings.push({
          severity: 'error',
          code: 'INVALID_FORMAT',
          key,
          message: `${key} does not match the required pattern ${re}.`,
        });
        continue;
      }
    }

    if (allowedValues !== undefined && Array.isArray(allowedValues)) {
      if (!allowedValues.includes(value)) {
        findings.push({
          severity: 'error',
          code: 'INVALID_FORMAT',
          key,
          message: `${key} must be one of: ${allowedValues.join(', ')} (got "${value}").`,
        });
        continue;
      }
    }

    findings.push({
      severity: 'pass',
      code: 'VALID_FORMAT',
      key,
      message: `${key} passes all format checks`,
    });
  }

  return findings;
}

