import { describe, it, expect } from 'vitest';
import { parseEnvContent, parseEnvFile } from '../src/core/parser.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

describe('parseEnvContent', () => {
  it('parses simple KEY=VALUE pairs', () => {
    const result = parseEnvContent('PORT=3000\nNODE_ENV=production');
    expect(result.env.PORT).toBe('3000');
    expect(result.env.NODE_ENV).toBe('production');
  });

  it('strips double quotes from values', () => {
    const result = parseEnvContent('NAME="hello world"');
    expect(result.env.NAME).toBe('hello world');
  });

  it('strips single quotes from values', () => {
    const result = parseEnvContent("NAME='hello world'");
    expect(result.env.NAME).toBe('hello world');
  });

  it('handles escape sequences in double-quoted values', () => {
    const result = parseEnvContent('MSG="line1\\nline2"');
    expect(result.env.MSG).toBe('line1\nline2');
  });

  it('detects blank lines', () => {
    const result = parseEnvContent('A=1\n\nB=2');
    const blanks = result.entries.filter((e) => e.type === 'blank');
    expect(blanks).toHaveLength(1);
  });

  it('detects comment lines', () => {
    const result = parseEnvContent('# This is a comment\nA=1');
    const comments = result.entries.filter((e) => e.type === 'comment');
    expect(comments).toHaveLength(1);
  });

  it('detects malformed lines', () => {
    const result = parseEnvContent('BADLINE\nA=1');
    const malformed = result.entries.filter((e) => e.type === 'malformed');
    expect(malformed).toHaveLength(1);
  });

  it('detects duplicate keys', () => {
    const result = parseEnvContent('KEY=first\nKEY=second');
    expect(result.duplicates).toContain('KEY');
    expect(result.env.KEY).toBe('second'); // last wins
  });

  it('handles empty values', () => {
    const result = parseEnvContent('EMPTY=');
    expect(result.env.EMPTY).toBe('');
  });

  it('strips inline comments from unquoted values', () => {
    const result = parseEnvContent('PORT=3000 # the port');
    expect(result.env.PORT).toBe('3000');
  });

  it('assigns correct line numbers', () => {
    const result = parseEnvContent('A=1\nB=2\nC=3');
    expect(result.entries[0].line).toBe(1);
    expect(result.entries[1].line).toBe(2);
    expect(result.entries[2].line).toBe(3);
  });
});

describe('parseEnvFile', () => {
  it('reads and parses a real fixture file', async () => {
    const result = await parseEnvFile(join(fixturesDir, '.env.test'));
    expect(result.env.PORT).toBe('3000');
    expect(result.env.NODE_ENV).toBe('development');
  });

  it('throws a clear error for missing files', async () => {
    await expect(parseEnvFile('/nonexistent/.env')).rejects.toThrow('File not found');
  });
});

