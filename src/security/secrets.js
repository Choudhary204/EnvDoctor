/**
 * @file secrets.js
 * @description Detects weak, default, or placeholder secret values.
 * NEVER prints actual values in findings.
 */

/** Patterns that look like placeholder / template values */
const PLACEHOLDER_PATTERNS = [
  /^your[-_]?.*here$/i,
  /^change[-_]?me$/i,
  /^replace[-_]?me$/i,
  /^todo$/i,
  /^fixme$/i,
  /^example$/i,
  /^test$/i,
  /^dummy$/i,
  /^placeholder$/i,
  /^<[^>]+>$/,       // <MY_SECRET>
  /^\[.*\]$/,        // [MY_SECRET]
  /^xxx+$/i,
  /^123456+$/,
  /^password\d*$/i,
  /^secret\d*$/i,
  /^admin\d*$/i,
  /^default\d*$/i,
  /^changeit$/i,
];

/** Keys that are expected to hold secret values */
const SECRET_KEY_PATTERNS = [
  /secret/i,
  /password/i,
  /passwd/i,
  /api[_-]?key/i,
  /token/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /jwt/i,
  /access[_-]?key/i,
  /encryption/i,
  /signing/i,
  /webhook/i,
  /passphrase/i,
];

const MIN_SECRET_ENTROPY_LENGTH = 16;

/**
 * Returns true if a key is expected to hold a secret value.
 * @param {string} key
 * @returns {boolean}
 */
function isSecretKey(key) {
  return SECRET_KEY_PATTERNS.some((p) => p.test(key));
}

/**
 * Returns true if the value looks like a placeholder.
 * @param {string} value
 * @returns {boolean}
 */
function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

/**
 * Rough entropy estimate — penalise low character-variety strings.
 * @param {string} value
 * @returns {number} bits of Shannon entropy
 */
function shannonEntropy(value) {
  const freq = {};
  for (const ch of value) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const count of Object.values(freq)) {
    const p = count / value.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Returns true when a secret value looks too weak (short, low-entropy, repetitive).
 * @param {string} value
 * @returns {{ weak: boolean, reason: string }}
 */
function isWeakSecret(value) {
  if (value.length < MIN_SECRET_ENTROPY_LENGTH) {
    return { weak: true, reason: `too short (${value.length} chars, minimum ${MIN_SECRET_ENTROPY_LENGTH})` };
  }
  const entropy = shannonEntropy(value);
  if (entropy < 2.5) {
    return { weak: true, reason: 'low character variety (predictable value)' };
  }
  return { weak: false, reason: '' };
}

/**
 * Scans all env key-value pairs for security concerns.
 * @param {Object}   env  - key→value map
 * @param {string[]} keys - ordered list of keys
 * @returns {import('../core/scanner.js').ScanFinding[]}
 */
export function detectWeakSecrets(env, keys) {
  const findings = [];

  for (const key of keys) {
    const value = env[key];
    if (value === '' || value == null) continue;

    if (isPlaceholder(value)) {
      findings.push({
        severity: 'error',
        code: 'PLACEHOLDER_VALUE',
        key,
        message: `${key} contains a placeholder value. Replace it with a real secret.`,
      });
      continue;
    }

    if (isSecretKey(key)) {
      const { weak, reason } = isWeakSecret(value);
      if (weak) {
        findings.push({
          severity: 'warning',
          code: 'WEAK_SECRET',
          key,
          message: `${key} appears to be a weak secret: ${reason}.`,
        });
      }
    }
  }

  return findings;
}

