/**
 * @file example-generator.js
 * @description Generates a .env.example file from an existing .env file.
 * - Preserves comments and blank lines for structure.
 * - Replaces all values with empty strings or provided placeholder descriptions.
 * - Never copies real values.
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { parseEnvFile, parseEnvContent } from '../core/parser.js';

/**
 * @typedef {Object} GenerateExampleOptions
 * @property {string}  [inputPath='.env']          - source env file
 * @property {string}  [outputPath='.env.example'] - output file path
 * @property {Object}  [descriptions={}]            - { KEY: 'description/placeholder text' }
 * @property {boolean} [overwrite=false]            - overwrite existing output file
 * @property {string}  [content]                    - raw content (skips file read)
 */

/**
 * Generates a .env.example file from an existing .env file.
 * @param {GenerateExampleOptions} options
 * @returns {Promise<{ outputPath: string, content: string, keys: string[] }>}
 */
export async function generateExample({
  inputPath = '.env',
  outputPath = '.env.example',
  descriptions = {},
  overwrite = false,
  content: rawContent,
} = {}) {
  const resolvedInput = resolve(inputPath);
  const resolvedOutput = resolve(outputPath);

  let parseResult;
  if (rawContent !== undefined) {
    parseResult = parseEnvContent(rawContent, resolvedInput);
  } else {
    parseResult = await parseEnvFile(resolvedInput);
  }

  // Check if output exists
  if (!overwrite) {
    try {
      await access(resolvedOutput);
      throw new Error(
        `Output file already exists: ${resolvedOutput}. Use overwrite: true to replace it.`
      );
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // ENOENT means file doesn't exist — safe to write
    }
  }

  // Build example content
  const lines = [];
  for (const entry of parseResult.entries) {
    if (entry.type === 'blank') {
      lines.push('');
    } else if (entry.type === 'comment') {
      lines.push(entry.text.trimEnd());
    } else if (entry.type === 'variable') {
      const placeholder = descriptions[entry.key] || '';
      lines.push(`${entry.key}=${placeholder}`);
    } else if (entry.type === 'malformed') {
      // Keep malformed lines commented out in the example
      lines.push(`# ${entry.text.trimEnd()} (malformed — please fix)`);
    }
  }

  const exampleContent = lines.join('\n') + '\n';
  const keys = parseResult.entries
    .filter((e) => e.type === 'variable')
    .map((e) => e.key);

  if (rawContent === undefined) {
    await writeFile(resolvedOutput, exampleContent, 'utf8');
  }

  return { outputPath: resolvedOutput, content: exampleContent, keys };
}

