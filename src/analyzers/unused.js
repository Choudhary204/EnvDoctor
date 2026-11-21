/**
 * @file unused.js
 * @description Scans JavaScript and TypeScript source files to find environment
 * variables that are never referenced via process.env.VARIABLE_NAME.
 *
 * IMPORTANT LIMITATION: Dynamic access patterns like process.env[varName] cannot
 * be statically detected. This tool reports potentially unused variables — always
 * review results manually before removing any variable.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SUPPORTED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt']);

/**
 * Recursively collects all JS/TS files under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectSourceFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(full)));
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Builds a regex that matches any of the common process.env access patterns.
 * @param {string} key
 * @returns {RegExp}
 */
function buildAccessPattern(key) {
  // Matches: process.env.KEY, process.env['KEY'], process.env["KEY"], import.meta.env.KEY
  return new RegExp(
    `process\\.env\\.${key}|process\\.env\\[['"\`]${key}['"\`]\\]|import\\.meta\\.env\\.${key}`,
    'g'
  );
}

/**
 * Scans project source files and identifies potentially unused env variables.
 * @param {string[]} keys       - all variable names from the .env file
 * @param {string}   projectRoot - root directory to scan
 * @returns {Promise<import('../core/scanner.js').ScanFinding[]>}
 */
export async function detectUnused(keys, projectRoot = '.') {
  const findings = [];
  if (keys.length === 0) return findings;

  const sourceFiles = await collectSourceFiles(projectRoot);

  if (sourceFiles.length === 0) {
    findings.push({
      severity: 'info',
      code: 'NO_SOURCE_FILES',
      key: '',
      message: 'No JavaScript/TypeScript source files found. Unused variable check skipped.',
    });
    return findings;
  }

  // Read all source files once and concatenate for fast scanning
  const contents = await Promise.all(
    sourceFiles.map((f) => readFile(f, 'utf8').catch(() => ''))
  );
  const combined = contents.join('\n');

  for (const key of keys) {
    const pattern = buildAccessPattern(key);
    if (!pattern.test(combined)) {
      findings.push({
        severity: 'warning',
        code: 'UNUSED_VARIABLE',
        key,
        message: `${key} is defined in .env but no reference to process.env.${key} was found in ${sourceFiles.length} source file(s). Note: dynamic access (process.env[varName]) cannot be statically detected.`,
      });
    }
  }

  return findings;
}

