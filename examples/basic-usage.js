/**
 * Basic usage example for env-doctor as a library.
 * Run: node examples/basic-usage.js
 */

import { diagnose } from '../src/index.js';

const report = await diagnose({
  // Use the test fixture so the example always runs
  filePath: new URL('../test/fixtures/.env.test', import.meta.url).pathname,
  required: ['PORT', 'DATABASE_URL', 'JWT_SECRET'],
  rules: {
    PORT: 'port',
    DATABASE_URL: 'url',
    JWT_SECRET: { type: 'string', minLength: 16 },
    DEBUG: 'boolean',
    NODE_ENV: { enum: ['development', 'production', 'test'] },
  },
  checkGit: false, // skip git check in examples
});

console.log('Health Score:', report.healthScore + '/100');
console.log('Total Variables:', report.totalVars);
console.log('Errors:', report.errors);
console.log('Warnings:', report.warnings);
console.log('Keys found:', report.keys);
console.log('\nSuggested Fixes:');
report.suggestedFixes.forEach((fix, i) => console.log(`  ${i + 1}. ${fix}`));

