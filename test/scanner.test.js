import { describe, it, expect } from 'vitest';
import { scan, isSensitiveKey, redactValue } from '../src/core/scanner.js';

describe('scan', () => {
  it('returns totalVars count', async () => {
    const result = await scan({ content: 'PORT=3000\nNODE_ENV=production' });
    expect(result.totalVars).toBe(2);
  });

  it('reports EMPTY_VALUE warning for empty variables', async () => {
    const result = await scan({ content: 'EMPTY_VAR=' });
    const f = result.findings.find((f) => f.code === 'EMPTY_VALUE');
    expect(f).toBeDefined();
    expect(f.severity).toBe('warning');
    expect(f.key).toBe('EMPTY_VAR');
  });

  it('reports MALFORMED_LINE error for invalid lines', async () => {
    const result = await scan({ content: 'BADLINE\nPORT=3000' });
    const f = result.findings.find((f) => f.code === 'MALFORMED_LINE');
    expect(f).toBeDefined();
    expect(f.severity).toBe('error');
  });

  it('reports DUPLICATE_KEY error', async () => {
    const result = await scan({ content: 'KEY=a\nKEY=b' });
    const f = result.findings.find((f) => f.code === 'DUPLICATE_KEY');
    expect(f).toBeDefined();
    expect(f.key).toBe('KEY');
  });

  it('reports no findings for a clean file', async () => {
    const result = await scan({ content: 'PORT=3000\nNODE_ENV=production' });
    const errors = result.findings.filter((f) => f.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('throws for missing file', async () => {
    await expect(scan({ filePath: '/nonexistent/.env' })).rejects.toThrow();
  });

  it('keys array contains all variable names', async () => {
    const result = await scan({ content: 'A=1\nB=2\nC=3' });
    expect(result.keys).toEqual(['A', 'B', 'C']);
  });
});

describe('isSensitiveKey', () => {
  it('identifies SECRET as sensitive', () => expect(isSensitiveKey('JWT_SECRET')).toBe(true));
  it('identifies API_KEY as sensitive', () => expect(isSensitiveKey('API_KEY')).toBe(true));
  it('identifies TOKEN as sensitive', () => expect(isSensitiveKey('ACCESS_TOKEN')).toBe(true));
  it('does not flag PORT as sensitive', () => expect(isSensitiveKey('PORT')).toBe(false));
  it('does not flag NODE_ENV as sensitive', () => expect(isSensitiveKey('NODE_ENV')).toBe(false));
});

describe('redactValue', () => {
  it('redacts sensitive keys entirely', () => {
    expect(redactValue('JWT_SECRET', 'mysecretvalue')).toBe('[REDACTED]');
  });

  it('shows (empty) for empty values', () => {
    expect(redactValue('PORT', '')).toBe('(empty)');
  });

  it('partially masks short non-sensitive values', () => {
    const r = redactValue('PORT', '3000');
    expect(r).toBe('[***]');
  });

  it('never returns the original sensitive value', () => {
    const original = 'super-secret-password-123';
    const redacted = redactValue('DB_PASSWORD', original);
    expect(redacted).not.toContain(original);
    expect(redacted).toBe('[REDACTED]');
  });
});

