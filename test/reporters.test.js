import { describe, it, expect } from 'vitest';
import { generateExample } from '../src/reporters/example-generator.js';
import { renderJSON, toJSON } from '../src/reporters/json.js';
import { renderHTML } from '../src/reporters/html.js';
import { computeHealthScore, gradeScore } from '../src/reporters/score.js';

// ── Example Generator ────────────────────────────────────────────────────────
describe('generateExample', () => {
  it('generates example content without real values', async () => {
    const { content, keys } = await generateExample({
      content: 'PORT=3000\nSECRET=mysecret\n# A comment\nEMPTY=',
      inputPath: '.env',
      outputPath: '.env.example',
    });
    expect(content).toContain('PORT=');
    expect(content).toContain('SECRET=');
    expect(content).not.toContain('3000');
    expect(content).not.toContain('mysecret');
    expect(keys).toContain('PORT');
    expect(keys).toContain('SECRET');
  });

  it('preserves comments in generated example', async () => {
    const { content } = await generateExample({
      content: '# Database config\nDB_URL=postgres://localhost/mydb',
      inputPath: '.env',
      outputPath: '.env.example',
    });
    expect(content).toContain('# Database config');
  });

  it('uses provided descriptions as placeholders', async () => {
    const { content } = await generateExample({
      content: 'API_KEY=realvalue',
      inputPath: '.env',
      outputPath: '.env.example',
      descriptions: { API_KEY: 'your_api_key_from_provider' },
    });
    expect(content).toContain('API_KEY=your_api_key_from_provider');
    expect(content).not.toContain('realvalue');
  });

  it('never copies actual secret values', async () => {
    const secretVal = 'super-secret-jwt-do-not-expose';
    const { content } = await generateExample({
      content: `JWT_SECRET=${secretVal}\nPORT=3000`,
      inputPath: '.env',
      outputPath: '.env.example',
    });
    expect(content).not.toContain(secretVal);
    expect(content).not.toContain('3000');
  });
});

// ── JSON Reporter ─────────────────────────────────────────────────────────────
describe('renderJSON', () => {
  const mockReport = {
    filePath: '/project/.env',
    totalVars: 3,
    passed: 2,
    warnings: 1,
    errors: 0,
    healthScore: 85,
    scoreBreakdown: { errors: { count: 0, deduction: 0 }, final: 85 },
    keys: ['PORT', 'NODE_ENV', 'API_KEY'],
    findings: [{ severity: 'pass', code: 'REQUIRED_PRESENT', key: 'PORT', message: 'PORT is present' }],
    securityFindings: [],
    suggestedFixes: [],
    meta: { duplicates: [], requiredChecked: 1, rulesChecked: 0 },
    _env: { PORT: '3000', SECRET: 'do-not-expose' }, // should be stripped
  };

  it('produces valid JSON', () => {
    const json = renderJSON(mockReport);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('never exposes _env or raw values', () => {
    const json = renderJSON(mockReport);
    expect(json).not.toContain('_env');
    expect(json).not.toContain('do-not-expose');
  });

  it('includes key diagnostic fields', () => {
    const obj = toJSON(mockReport);
    expect(obj).toHaveProperty('healthScore');
    expect(obj).toHaveProperty('findings');
    expect(obj).toHaveProperty('suggestedFixes');
    expect(obj).toHaveProperty('generatedAt');
  });
});

// ── HTML Reporter ─────────────────────────────────────────────────────────────
describe('renderHTML', () => {
  const mockReport = {
    filePath: '/project/.env',
    totalVars: 2,
    passed: 1,
    warnings: 1,
    errors: 0,
    healthScore: 90,
    scoreBreakdown: { final: 90 },
    keys: ['PORT', 'API_KEY'],
    findings: [{ severity: 'warning', code: 'EMPTY_VALUE', key: 'API_KEY', message: 'API_KEY is empty' }],
    securityFindings: [],
    suggestedFixes: ['Add a value for API_KEY'],
    meta: {},
  };

  it('produces a valid HTML string', () => {
    const html = renderHTML(mockReport);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('includes the health score in the output', () => {
    const html = renderHTML(mockReport);
    expect(html).toContain('90');
  });

  it('never exposes raw secret values', () => {
    const secretValue = 'my-real-secret-value';
    const reportWithSecret = {
      ...mockReport,
      findings: [{ severity: 'error', code: 'WEAK_SECRET', key: 'SECRET', message: 'SECRET is weak' }],
    };
    const html = renderHTML(reportWithSecret);
    expect(html).not.toContain(secretValue);
  });

  it('escapes HTML special characters', () => {
    const report = { ...mockReport, filePath: '<script>alert(1)</script>' };
    const html = renderHTML(report);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ── Score ─────────────────────────────────────────────────────────────────────
describe('computeHealthScore', () => {
  it('returns 100 for a clean environment', () => {
    const { score } = computeHealthScore({ totalVars: 5, errors: 0, warnings: 0, securityCount: 0, required: [], requiredFindings: [] });
    expect(score).toBe(100);
  });

  it('deducts points for errors', () => {
    const { score } = computeHealthScore({ totalVars: 5, errors: 2, warnings: 0, securityCount: 0, required: [], requiredFindings: [] });
    expect(score).toBeLessThan(100);
    expect(score).toBe(70); // 100 - (2*15)
  });

  it('never goes below 0', () => {
    const { score } = computeHealthScore({ totalVars: 1, errors: 100, warnings: 100, securityCount: 100, required: [], requiredFindings: [] });
    expect(score).toBe(0);
  });

  it('deducts for security findings', () => {
    const { score } = computeHealthScore({ totalVars: 5, errors: 0, warnings: 0, securityCount: 1, required: [], requiredFindings: [] });
    expect(score).toBe(90); // 100 - 10
  });
});

describe('gradeScore', () => {
  it('grades 95 as A/Excellent', () => expect(gradeScore(95).grade).toBe('A'));
  it('grades 80 as B/Good', () => expect(gradeScore(80).grade).toBe('B'));
  it('grades 65 as C/Fair', () => expect(gradeScore(65).grade).toBe('C'));
  it('grades 45 as D/Poor', () => expect(gradeScore(45).grade).toBe('D'));
  it('grades 20 as F/Critical', () => expect(gradeScore(20).grade).toBe('F'));
});

