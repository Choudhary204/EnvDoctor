import { describe, it, expect } from 'vitest';
import { diagnose } from '../src/core/engine.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

describe('diagnose', () => {
  it('returns a complete DiagnosticReport', async () => {
    const report = await diagnose({
      content: 'PORT=3000\nNODE_ENV=development',
      filePath: '.env',
      checkGit: false,
    });
    expect(report).toHaveProperty('healthScore');
    expect(report).toHaveProperty('findings');
    expect(report).toHaveProperty('keys');
    expect(report).toHaveProperty('suggestedFixes');
    expect(report.totalVars).toBe(2);
  });

  it('detects missing required variables', async () => {
    const report = await diagnose({
      content: 'PORT=3000',
      filePath: '.env',
      required: ['PORT', 'DATABASE_URL', 'JWT_SECRET'],
      checkGit: false,
    });
    const missing = report.findings.filter((f) => f.code === 'MISSING_REQUIRED');
    expect(missing.map((f) => f.key)).toContain('DATABASE_URL');
    expect(missing.map((f) => f.key)).toContain('JWT_SECRET');
  });

  it('validates types correctly', async () => {
    const report = await diagnose({
      content: 'PORT=abc\nDEBUG=maybe',
      filePath: '.env',
      rules: { PORT: 'number', DEBUG: 'boolean' },
      checkGit: false,
    });
    const typeErrors = report.findings.filter((f) => f.code === 'INVALID_TYPE');
    expect(typeErrors.length).toBeGreaterThanOrEqual(2);
  });

  it('validates format constraints', async () => {
    const report = await diagnose({
      content: 'SECRET=short',
      filePath: '.env',
      rules: { SECRET: { minLength: 16 } },
      checkGit: false,
    });
    const fmtErrors = report.findings.filter((f) => f.code === 'INVALID_FORMAT');
    expect(fmtErrors.length).toBeGreaterThan(0);
  });

  it('detects placeholder values in security scan', async () => {
    const report = await diagnose({
      content: 'API_KEY=your_api_key_here',
      filePath: '.env',
      checkGit: false,
    });
    expect(report.securityFindings.some((f) => f.code === 'PLACEHOLDER_VALUE')).toBe(true);
  });

  it('health score degrades with errors', async () => {
    const cleanReport = await diagnose({
      content: 'PORT=3000\nNODE_ENV=development',
      filePath: '.env',
      checkGit: false,
    });
    const dirtyReport = await diagnose({
      content: 'API_KEY=your_key\nSECRET=abc',
      filePath: '.env',
      required: ['PORT', 'DATABASE_URL'],
      checkGit: false,
    });
    expect(cleanReport.healthScore).toBeGreaterThan(dirtyReport.healthScore);
  });

  it('health score is between 0 and 100', async () => {
    const report = await diagnose({
      content: 'PORT=3000',
      filePath: '.env',
      checkGit: false,
    });
    expect(report.healthScore).toBeGreaterThanOrEqual(0);
    expect(report.healthScore).toBeLessThanOrEqual(100);
  });

  it('suggested fixes are provided for errors', async () => {
    const report = await diagnose({
      content: 'API_KEY=your_api_key_here',
      filePath: '.env',
      required: ['DATABASE_URL'],
      checkGit: false,
    });
    expect(report.suggestedFixes.length).toBeGreaterThan(0);
  });

  it('never exposes secret values in the report', async () => {
    const secretValue = 'this-is-my-real-secret-do-not-expose';
    const report = await diagnose({
      content: `JWT_SECRET=${secretValue}`,
      filePath: '.env',
      checkGit: false,
    });
    const reportJSON = JSON.stringify(report);
    expect(reportJSON).not.toContain(secretValue);
    expect(report).not.toHaveProperty('_env');
  });

  it('does not include _env in the report', async () => {
    const report = await diagnose({
      content: 'SECRET=mysecretvalue',
      filePath: '.env',
      checkGit: false,
    });
    expect(report._env).toBeUndefined();
  });

  it('throws for an invalid file path', async () => {
    await expect(
      diagnose({ filePath: '/nonexistent/path/.env', checkGit: false })
    ).rejects.toThrow();
  });

  it('works with a real fixture file', async () => {
    const report = await diagnose({
      filePath: join(fixtures, '.env.test'),
      checkGit: false,
    });
    expect(report.totalVars).toBeGreaterThan(0);
    expect(report.healthScore).toBeGreaterThanOrEqual(0);
  });
});

