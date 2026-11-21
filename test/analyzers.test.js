import { describe, it, expect } from 'vitest';
import { detectDuplicates } from '../src/analyzers/duplicate.js';
import { detectUnused } from '../src/analyzers/unused.js';

// ── Duplicates ───────────────────────────────────────────────────────────────
describe('detectDuplicates', () => {
  it('detects duplicate keys', async () => {
    const { duplicates, findings } = await detectDuplicates('.env', 'KEY=a\nKEY=b\nKEY=c');
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].key).toBe('KEY');
    expect(duplicates[0].lines).toHaveLength(3);
  });

  it('reports duplicate finding with correct severity', async () => {
    const { findings } = await detectDuplicates('.env', 'KEY=a\nKEY=b');
    expect(findings[0].severity).toBe('error');
    expect(findings[0].code).toBe('DUPLICATE_KEY');
  });

  it('returns empty when no duplicates', async () => {
    const { duplicates } = await detectDuplicates('.env', 'A=1\nB=2\nC=3');
    expect(duplicates).toHaveLength(0);
  });

  it('never exposes actual values in reports', async () => {
    const secretVal = 'my-secret-value-do-not-show';
    const { duplicates } = await detectDuplicates('.env', `SECRET=${secretVal}\nSECRET=other`);
    for (const d of duplicates) {
      expect(d.usedValue).not.toContain(secretVal);
      expect(JSON.stringify(d)).not.toContain(secretVal);
    }
  });

  it('handles multiple distinct duplicate keys', async () => {
    const { duplicates } = await detectDuplicates('.env', 'A=1\nA=2\nB=x\nB=y');
    expect(duplicates).toHaveLength(2);
  });
});

// ── Unused ────────────────────────────────────────────────────────────────────
describe('detectUnused', () => {
  it('returns info finding when no source files exist', async () => {
    const findings = await detectUnused(['PORT'], '/nonexistent-project-dir');
    expect(findings[0].code).toBe('NO_SOURCE_FILES');
  });

  it('returns empty array when no keys provided', async () => {
    const findings = await detectUnused([], '.');
    expect(findings).toHaveLength(0);
  });
});

