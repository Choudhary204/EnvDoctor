/**
 * @file duplicate.js
 * @description Provides detailed duplicate-key detection from a parsed env file.
 * The core parser already flags duplicates; this module formats richer findings.
 */

import { parseEnvFile, parseEnvContent } from '../core/parser.js';

/**
 * @typedef {Object} DuplicateReport
 * @property {string}   key
 * @property {number[]} lines   - all line numbers where this key appears
 * @property {string}   usedValue - which occurrence is actually used (last-write-wins)
 */

/**
 * Finds duplicate keys in an .env file and returns structured findings.
 * @param {string} [filePath='.env']
 * @param {string} [content]           - raw content (skips file read when given)
 * @returns {Promise<{ duplicates: DuplicateReport[], findings: Object[] }>}
 */
export async function detectDuplicates(filePath = '.env', content) {
  let parseResult;
  if (content !== undefined) {
    parseResult = parseEnvContent(content, filePath);
  } else {
    parseResult = await parseEnvFile(filePath);
  }

  const { entries, duplicates: dupKeys } = parseResult;

  const duplicates = dupKeys.map((key) => {
    const occurrences = entries.filter((e) => e.type === 'variable' && e.key === key);
    return {
      key,
      lines: occurrences.map((e) => e.line),
      usedValue: '[REDACTED — last value wins]',
    };
  });

  const findings = duplicates.map((d) => ({
    severity: 'error',
    code: 'DUPLICATE_KEY',
    key: d.key,
    message: `"${d.key}" is defined ${d.lines.length} times (lines: ${d.lines.join(', ')}). Only the last value is active.`,
  }));

  return { duplicates, findings };
}

