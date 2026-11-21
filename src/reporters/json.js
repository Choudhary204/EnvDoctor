/**
 * @file json.js
 * @description Serialises a DiagnosticReport to JSON format.
 * Strips internal fields (like _env) so secrets are never exposed.
 */

/**
 * Converts a DiagnosticReport to a clean JSON object safe to log or save.
 * @param {import('../core/engine.js').DiagnosticReport} report
 * @returns {Object}
 */
export function toJSON(report) {
  // Destructure to exclude _env / any internal field
  const {
    filePath,
    totalVars,
    passed,
    warnings,
    errors,
    healthScore,
    scoreBreakdown,
    keys,
    findings,
    securityFindings,
    suggestedFixes,
    meta,
  } = report;

  return {
    filePath,
    totalVars,
    passed,
    warnings,
    errors,
    healthScore,
    scoreBreakdown,
    keys,
    findings: findings.map(sanitizeFinding),
    securityFindings: securityFindings.map(sanitizeFinding),
    suggestedFixes,
    meta,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Sanitises a single finding — removes any accidental value leakage.
 * @param {Object} f
 * @returns {Object}
 */
function sanitizeFinding(f) {
  const { severity, code, key, line, message } = f;
  return { severity, code, key, ...(line !== undefined ? { line } : {}), message };
}

/**
 * Renders a DiagnosticReport as a formatted JSON string.
 * @param {import('../core/engine.js').DiagnosticReport} report
 * @param {number} [indent=2]
 * @returns {string}
 */
export function renderJSON(report, indent = 2) {
  return JSON.stringify(toJSON(report), null, indent);
}

/**
 * Serialises a comparison result to JSON.
 * @param {import('../analyzers/comparator.js').CompareResult} result
 * @returns {string}
 */
export function renderComparisonJSON(result) {
  const { baseFile, compareFile, missingInCompare, extraInCompare, emptyInBase, emptyInCompare, findings } = result;
  return JSON.stringify(
    {
      baseFile,
      compareFile,
      missingInCompare,
      extraInCompare,
      emptyInBase,
      emptyInCompare,
      findings: findings.map(sanitizeFinding),
      generatedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

