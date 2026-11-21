import { describe, it, expect } from 'vitest';
import { compareEnvFiles, compareMultiple } from '../src/analyzers/comparator.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

describe('compareEnvFiles', () => {
  it('detects missing variables in compare file', async () => {
    const result = await compareEnvFiles({
      baseFile: 'base',
      compareFile: 'compare',
      baseContent: 'PORT=3000\nSECRET=abc\nNEW_VAR=xyz',
      compareContent: 'PORT=3000\nSECRET=abc',
    });
    expect(result.missingInCompare).toContain('NEW_VAR');
  });

  it('detects extra variables in compare file', async () => {
    const result = await compareEnvFiles({
      baseFile: 'base',
      compareFile: 'compare',
      baseContent: 'PORT=3000',
      compareContent: 'PORT=3000\nEXTRA_VAR=hello',
    });
    expect(result.extraInCompare).toContain('EXTRA_VAR');
  });

  it('detects empty values in compare', async () => {
    const result = await compareEnvFiles({
      baseFile: 'base',
      compareFile: 'compare',
      baseContent: 'API_KEY=realvalue',
      compareContent: 'API_KEY=',
    });
    expect(result.emptyInCompare).toContain('API_KEY');
  });

  it('detects empty values in base', async () => {
    const result = await compareEnvFiles({
      baseFile: 'base',
      compareFile: 'compare',
      baseContent: 'API_KEY=',
      compareContent: 'API_KEY=something',
    });
    expect(result.emptyInBase).toContain('API_KEY');
  });

  it('reports no differences for identical files', async () => {
    const content = 'PORT=3000\nNODE_ENV=production';
    const result = await compareEnvFiles({
      baseFile: 'base',
      compareFile: 'compare',
      baseContent: content,
      compareContent: content,
    });
    expect(result.findings).toHaveLength(0);
  });

  it('compares real fixture files', async () => {
    const result = await compareEnvFiles({
      baseFile: join(fixtures, '.env.development'),
      compareFile: join(fixtures, '.env.production'),
    });
    // .env.production is missing REDIS_URL and API_KEY that are in .env.development
    expect(result.missingInCompare.length).toBeGreaterThan(0);
  });

  it('never exposes actual values in findings messages', async () => {
    const secretValue = 'super-secret-do-not-show';
    const result = await compareEnvFiles({
      baseFile: 'base',
      compareFile: 'compare',
      baseContent: `SECRET=${secretValue}`,
      compareContent: 'OTHER=x',
    });
    for (const f of result.findings) {
      expect(f.message).not.toContain(secretValue);
    }
  });
});

describe('compareMultiple', () => {
  it('compares multiple files against a base', async () => {
    const results = await compareMultiple(
      join(fixtures, '.env.development'),
      [join(fixtures, '.env.production')]
    );
    expect(results).toHaveLength(1);
    expect(results[0].missingInCompare.length + results[0].extraInCompare.length).toBeGreaterThan(0);
  });
});

