/**
 * @file index.js
 * @description Public API for the env-doctor npm package.
 *
 * @example
 * import { diagnose, compareEnvFiles, generateExample } from 'env-doctor';
 */

export { diagnose } from './core/engine.js';
export { scan } from './core/scanner.js';
export { parseEnvFile, parseEnvContent } from './core/parser.js';
export { validateRequired } from './validators/required.js';
export { validateTypes } from './validators/types.js';
export { validateFormats } from './validators/format.js';
export { detectWeakSecrets } from './security/secrets.js';
export { checkGitTracking } from './security/git-check.js';
export { detectDuplicates } from './analyzers/duplicate.js';
export { detectUnused } from './analyzers/unused.js';
export { compareEnvFiles, compareMultiple } from './analyzers/comparator.js';
export { generateExample } from './reporters/example-generator.js';
export { renderTerminal, renderComparison, renderSuccess, renderError } from './reporters/terminal.js';
export { renderJSON, renderComparisonJSON, toJSON } from './reporters/json.js';
export { renderHTML } from './reporters/html.js';
export { computeHealthScore, gradeScore } from './reporters/score.js';
export { isSensitiveKey, redactValue } from './core/scanner.js';

