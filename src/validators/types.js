/**
 * @file types.js
 * @description Validates environment variable values against declared types:
 * string, number, boolean, url, port, email.
 */

/**
 * @param {Object} rules - { VAR_NAME: 'type' | { type, minLength, maxLength, ... } }
 * @param {Object} env   - parsed key→value map
 * @returns {import('../core/scanner.js').ScanFinding[]}
 */
export function validateTypes(rules, env) {
  const findings = [];

  for (const [key, rule] of Object.entries(rules)) {
    // Skip variables not present in env — required.js handles that
    if (!(key in env) || env[key] === '' || env[key] == null) continue;

    const type = typeof rule === 'string' ? rule : rule.type;
    if (!type) continue;

    const value = env[key];
    const result = checkType(value, type);

    if (!result.valid) {
      findings.push({
        severity: 'error',
        code: 'INVALID_TYPE',
        key,
        message: `${key} must be a valid ${type}. ${result.reason}`,
      });
    } else {
      findings.push({
        severity: 'pass',
        code: 'VALID_TYPE',
        key,
        message: `${key} is a valid ${type}`,
      });
    }
  }

  return findings;
}

/**
 * Checks whether a string value satisfies the given type.
 * @param {string} value
 * @param {string} type
 * @returns {{ valid: boolean, reason?: string }}
 */
function checkType(value, type) {
  switch (type.toLowerCase()) {
    case 'string':
      // Any non-empty string is valid
      return { valid: true };

    case 'number': {
      const n = Number(value);
      if (isNaN(n)) return { valid: false, reason: `"${truncate(value)}" is not a number.` };
      return { valid: true };
    }

    case 'integer': {
      const n = Number(value);
      if (!Number.isInteger(n)) return { valid: false, reason: `"${truncate(value)}" is not an integer.` };
      return { valid: true };
    }

    case 'boolean': {
      const lower = value.toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
        return { valid: false, reason: `"${truncate(value)}" is not a boolean (expected true/false/1/0/yes/no).` };
      }
      return { valid: true };
    }

    case 'url': {
      try {
        const url = new URL(value);
        if (!['http:', 'https:', 'postgres:', 'postgresql:', 'mysql:', 'mongodb:', 'redis:'].includes(url.protocol)) {
          return { valid: false, reason: `Protocol "${url.protocol}" may not be valid for a URL.` };
        }
        return { valid: true };
      } catch {
        return { valid: false, reason: `"${truncate(value)}" is not a valid URL.` };
      }
    }

    case 'port': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        return { valid: false, reason: `"${truncate(value)}" is not a valid port number (1–65535).` };
      }
      return { valid: true };
    }

    case 'email': {
      // Simple RFC-5321 surface check
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value)) {
        return { valid: false, reason: `"${truncate(value)}" does not look like a valid email address.` };
      }
      return { valid: true };
    }

    default:
      return { valid: true }; // unknown type — skip silently
  }
}

/** Truncates long values for error messages (never expose full secrets). */
function truncate(v, max = 20) {
  if (v.length <= max) return v;
  return v.slice(0, max) + '…';
}

