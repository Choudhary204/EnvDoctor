/**
 * @file comparator.js
 * @description Compares multiple .env files and reports missing, extra,
 * empty, and differing variables between environments.
 * Never exposes actual secret values.
 */

import { parseEnvFile, parseEnvContent } from '../core/parser.js';
import { isSensitiveKey } from '../core/scanner.js';

/**
 * @typedef {Object} CompareResult
 * @property {string}   baseFile
 * @property {string}   compareFile
 * @property {string[]} missingInCompare  - present in base, absent in compare
 * @property {string[]} extraInCompare    - absent in base, present in compare
 * @property {string[]} emptyInCompare    - present but empty in compare
 * @property {string[]} emptyInBase       - present but empty in base
 * @property {Object[]} findings
 */

/**
 * Loads an env file by path or uses provided content.
 * @param {string} filePath
 * @param {string} [content]
 * @returns {Promise<{ env: Object, keys: string[], filePath: string }>}
 */
async function loadEnv(filePath, content) {
  const result =
    content !== undefined
      ? parseEnvContent(content, filePath)
      : await parseEnvFile(filePath);

  const keys = result.entries.filter((e) => e.type === 'variable').map((e) => e.key);
  return { env: result.env, keys, filePath: result.filePath };
}

/**
 * Compares two .env files and returns structured differences.
 * @param {Object} options
 * @param {string} options.baseFile         - path to base env file
 * @param {string} options.compareFile      - path to env file to compare against
 * @param {string} [options.baseContent]    - raw content for base (skips file read)
 * @param {string} [options.compareContent] - raw content for compare (skips file read)
 * @returns {Promise<CompareResult>}
 */
export async function compareEnvFiles({ baseFile, compareFile, baseContent, compareContent }) {
  const [base, compare] = await Promise.all([
    loadEnv(baseFile, baseContent),
    loadEnv(compareFile, compareContent),
  ]);

  const baseKeys = new Set(base.keys);
  const compareKeys = new Set(compare.keys);

  const missingInCompare = base.keys.filter((k) => !compareKeys.has(k));
  const extraInCompare = compare.keys.filter((k) => !baseKeys.has(k));
  const emptyInBase = base.keys.filter((k) => base.env[k] === '');
  const emptyInCompare = compare.keys.filter((k) => compare.env[k] === '');

  const findings = [];

  for (const key of missingInCompare) {
    findings.push({
      severity: 'error',
      code: 'MISSING_IN_COMPARE',
      key,
      message: `${key} is in ${base.filePath} but missing from ${compare.filePath}`,
    });
  }

  for (const key of extraInCompare) {
    findings.push({
      severity: 'warning',
      code: 'EXTRA_IN_COMPARE',
      key,
      message: `${key} is in ${compare.filePath} but not in ${base.filePath}`,
    });
  }

  for (const key of emptyInBase) {
    findings.push({
      severity: 'warning',
      code: 'EMPTY_IN_BASE',
      key,
      message: `${key} has an empty value in ${base.filePath}`,
    });
  }

  for (const key of emptyInCompare) {
    if (!emptyInBase.includes(key)) {
      findings.push({
        severity: 'warning',
        code: 'EMPTY_IN_COMPARE',
        key,
        message: `${key} has an empty value in ${compare.filePath}`,
      });
    }
  }

  return {
    baseFile: base.filePath,
    compareFile: compare.filePath,
    missingInCompare,
    extraInCompare,
    emptyInBase,
    emptyInCompare,
    findings,
  };
}

/**
 * Compares multiple env files against a base file.
 * @param {string}   baseFile
 * @param {string[]} otherFiles
 * @returns {Promise<CompareResult[]>}
 */
export async function compareMultiple(baseFile, otherFiles) {
  return Promise.all(
    otherFiles.map((compareFile) => compareEnvFiles({ baseFile, compareFile }))
  );
}

