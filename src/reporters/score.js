/**
 * @file score.js
 * @description Computes the environment health score (0–100) based on documented rules.
 *
 * Scoring breakdown:
 *   - Base score starts at 100.
 *   - Each error deducts 15 points (capped at 60 total deduction).
 *   - Each warning deducts 5 points (capped at 25 total deduction).
 *   - Each security finding deducts 10 points (capped at 30 total deduction).
 *   - Missing required variables additionally deduct 10 points each (capped at 20).
 *   - Score is floored at 0.
 */

/**
 * @typedef {Object} ScoreInput
 * @property {number}   totalVars
 * @property {number}   errors
 * @property {number}   warnings
 * @property {number}   securityCount
 * @property {string[]} required
 * @property {Object[]} requiredFindings
 */

/**
 * @typedef {Object} ScoreResult
 * @property {number} score        - final 0–100 health score
 * @property {Object} breakdown    - itemised deduction log
 */

/**
 * @param {ScoreInput} input
 * @returns {ScoreResult}
 */
export function computeHealthScore({
  totalVars = 0,
  errors = 0,
  warnings = 0,
  securityCount = 0,
  required = [],
  requiredFindings = [],
}) {
  let score = 100;
  const breakdown = {};

  // Error deductions: -15 each, max -60
  const errorDeduction = Math.min(errors * 15, 60);
  score -= errorDeduction;
  breakdown.errors = { count: errors, deduction: -errorDeduction };

  // Warning deductions: -5 each, max -25
  const warnDeduction = Math.min(warnings * 5, 25);
  score -= warnDeduction;
  breakdown.warnings = { count: warnings, deduction: -warnDeduction };

  // Security deductions: -10 each, max -30
  const secDeduction = Math.min(securityCount * 10, 30);
  score -= secDeduction;
  breakdown.security = { count: securityCount, deduction: -secDeduction };

  // Missing required: -10 each on top, max -20
  const missingRequired = requiredFindings.filter(
    (f) => f.code === 'MISSING_REQUIRED'
  ).length;
  const reqDeduction = Math.min(missingRequired * 10, 20);
  score -= reqDeduction;
  breakdown.missingRequired = { count: missingRequired, deduction: -reqDeduction };

  score = Math.max(0, Math.round(score));
  breakdown.final = score;

  return { score, breakdown };
}

/**
 * Returns a letter grade and label for a score.
 * @param {number} score
 * @returns {{ grade: string, label: string, color: string }}
 */
export function gradeScore(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: 'green' };
  if (score >= 75) return { grade: 'B', label: 'Good', color: 'cyan' };
  if (score >= 60) return { grade: 'C', label: 'Fair', color: 'yellow' };
  if (score >= 40) return { grade: 'D', label: 'Poor', color: 'red' };
  return { grade: 'F', label: 'Critical', color: 'red' };
}

