/**
 * Advanced usage example — comparison, example generation, JSON report.
 * Run: node examples/advanced-usage.js
 */

import { compareEnvFiles, generateExample, renderJSON, renderTerminal } from '../src/index.js';
import { diagnose } from '../src/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'test', 'fixtures');

// ── 1. Full diagnostic with terminal output ───────────────────────────────
console.log('\n=== Full Diagnostic ===');
const { renderTerminal: render } = await import('../src/reporters/terminal.js');
const report = await diagnose({
  filePath: join(fixtures, '.env.test'),
  required: ['PORT', 'DATABASE_URL'],
  rules: { PORT: 'port', DATABASE_URL: 'url' },
  checkGit: false,
});
render(report);

// ── 2. Compare two environment files ─────────────────────────────────────
console.log('\n=== Comparison ===');
const comparison = await compareEnvFiles({
  baseFile: join(fixtures, '.env.development'),
  compareFile: join(fixtures, '.env.production'),
});
console.log('Missing in production:', comparison.missingInCompare);
console.log('Extra in production:', comparison.extraInCompare);
console.log('Differences found:', comparison.findings.length);

// ── 3. Generate .env.example ──────────────────────────────────────────────
console.log('\n=== Example Generation ===');
const { content, keys } = await generateExample({
  inputPath: join(fixtures, '.env.development'),
  outputPath: '/tmp/env-doctor-example-output.env',
  overwrite: true,
  descriptions: {
    DATABASE_URL: 'postgresql://user:password@host:5432/dbname',
    JWT_SECRET: 'your_jwt_secret_here_min_32_chars',
  },
});
console.log('Generated example with keys:', keys);
console.log('\nExample content (no real values):');
console.log(content);

// ── 4. JSON output ────────────────────────────────────────────────────────
console.log('\n=== JSON Report (excerpt) ===');
const json = renderJSON(report);
const parsed = JSON.parse(json);
console.log('healthScore:', parsed.healthScore);
console.log('findings count:', parsed.findings.length);
console.log('generatedAt:', parsed.generatedAt);

