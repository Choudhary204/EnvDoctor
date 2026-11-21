/**
 * @file parser.js
 * @description Parses .env files into structured entries, preserving comments,
 * blank lines, line numbers, and detecting duplicate keys — without using dotenv
 * so we have full control over the parse output.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * @typedef {Object} EnvEntry
 * @property {'variable'|'comment'|'blank'} type
 * @property {number} line     - 1-based line number
 * @property {string} [key]    - variable name (type === 'variable')
 * @property {string} [raw]    - raw value string as written in the file
 * @property {string} [value]  - unquoted, unescaped value
 * @property {string} [comment]- inline comment stripped from the value
 * @property {string} [text]   - raw text of a comment/blank line
 */

/**
 * @typedef {Object} ParseResult
 * @property {EnvEntry[]}   entries    - All parsed entries in order
 * @property {Object}       env        - Key→value map (last-write-wins, same as dotenv)
 * @property {string[]}     duplicates - Keys that appear more than once
 * @property {string}       filePath   - Resolved file path
 */

/**
 * Strips surrounding quotes from a value and handles basic escape sequences.
 * @param {string} raw
 * @returns {{ value: string, comment: string }}
 */
function parseValue(raw) {
  raw = raw.trim();

  // Double-quoted value: honour \n \t \r escape sequences, strip comment after closing quote
  if (raw.startsWith('"')) {
    const end = findClosingQuote(raw, '"');
    const inner = raw.slice(1, end);
    const comment = raw.slice(end + 1).replace(/^\s*#.*/, '').trim();
    return {
      value: inner
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'),
      comment,
    };
  }

  // Single-quoted value: treat literally, strip comment after closing quote
  if (raw.startsWith("'")) {
    const end = findClosingQuote(raw, "'");
    const inner = raw.slice(1, end);
    const comment = raw.slice(end + 1).replace(/^\s*#.*/, '').trim();
    return { value: inner, comment };
  }

  // Unquoted: strip inline comment (# preceded by whitespace)
  const commentMatch = raw.match(/^(.*?)\s+#.*$/);
  if (commentMatch) {
    return { value: commentMatch[1].trim(), comment: '' };
  }

  return { value: raw, comment: '' };
}

/**
 * Finds the index of the matching closing quote character.
 * @param {string} str
 * @param {'"'|"'"} quote
 * @returns {number}
 */
function findClosingQuote(str, quote) {
  let i = 1;
  while (i < str.length) {
    if (str[i] === '\\' && quote === '"') { i += 2; continue; }
    if (str[i] === quote) return i;
    i++;
  }
  return str.length; // unterminated — treat rest as value
}

/**
 * Parses a raw .env file string into structured entries.
 * @param {string} content - raw file content
 * @param {string} filePath - path used for error messages
 * @returns {ParseResult}
 */
export function parseEnvContent(content, filePath = '<inline>') {
  const lines = content.split(/\r?\n/);
  const entries = [];
  const keyCount = {};
  const env = {};

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    // Blank line
    if (trimmed === '') {
      entries.push({ type: 'blank', line: lineNumber, text: raw });
      continue;
    }

    // Comment line
    if (trimmed.startsWith('#')) {
      entries.push({ type: 'comment', line: lineNumber, text: raw });
      continue;
    }

    // Variable assignment: KEY=VALUE or KEY: VALUE (KEY= is valid, value is empty)
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)/s);
    if (!match) {
      // Malformed line — record as a special entry
      entries.push({ type: 'malformed', line: lineNumber, text: raw });
      continue;
    }

    const key = match[1];
    const rawValue = match[2];
    const { value, comment } = parseValue(rawValue);

    keyCount[key] = (keyCount[key] || 0) + 1;
    env[key] = value; // last write wins

    entries.push({
      type: 'variable',
      line: lineNumber,
      key,
      raw: rawValue,
      value,
      comment,
    });
  }

  const duplicates = Object.keys(keyCount).filter((k) => keyCount[k] > 1);

  return { entries, env, duplicates, filePath };
}

/**
 * Reads and parses a .env file from disk.
 * @param {string} filePath - path to the .env file
 * @returns {Promise<ParseResult>}
 * @throws {Error} if the file cannot be read
 */
export async function parseEnvFile(filePath) {
  const resolved = resolve(filePath);
  let content;
  try {
    content = await readFile(resolved, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${resolved}`);
    }
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied reading: ${resolved}`);
    }
    throw new Error(`Failed to read ${resolved}: ${err.message}`);
  }
  return parseEnvContent(content, resolved);
}

