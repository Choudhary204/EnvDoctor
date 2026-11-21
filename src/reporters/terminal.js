/**
 * @file terminal.js
 * @description Renders a DiagnosticReport to the terminal using Chalk for colours.
 * Designed to be visually clean and professional.
 */

import chalk from 'chalk';
import { gradeScore } from './score.js';

const ICONS = {
  pass: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
  security: chalk.magenta('🔒'),
};

function hr(char = '─', len = 50) {
  return chalk.gray(char.repeat(len));
}

function severityIcon(severity) {
  return ICONS[severity] || chalk.gray('·');
}

function severityColor(severity) {
  switch (severity) {
    case 'error':   return chalk.red;
    case 'warning': return chalk.yellow;
    case 'pass':    return chalk.green;
    case 'info':    return chalk.blue;
    default:        return chalk.white;
  }
}

/**
 * Renders the full diagnostic report to the terminal.
 * @param {import('../core/engine.js').DiagnosticReport} report
 * @param {Object} [opts]
 * @param {boolean} [opts.verbose=false] - show passing checks too
 */
export function renderTerminal(report, opts = {}) {
  const { verbose = false } = opts;
  const { grade, label } = gradeScore(report.healthScore);

  // ── Header ───────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold.cyan('╔══════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║') + chalk.bold.white('            🩺  ENV DOCTOR                    ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('║') + chalk.gray('        Environment Diagnostics v1.0          ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════╝'));
  console.log('');

  // ── File info ────────────────────────────────────────────────────────────
  console.log(chalk.bold('File: ') + chalk.underline(report.filePath));
  console.log(chalk.bold('Variables found: ') + report.totalVars);
  console.log('');
  console.log(chalk.bold('Scanning environment configuration...'));
  console.log(hr());
  console.log('');

  // ── Findings ─────────────────────────────────────────────────────────────
  const visibleFindings = verbose
    ? report.findings
    : report.findings.filter((f) => f.severity !== 'pass');

  if (visibleFindings.length === 0) {
    console.log(chalk.green('✓ All checks passed.'));
  } else {
    for (const f of visibleFindings) {
      const icon = severityIcon(f.severity);
      const color = severityColor(f.severity);
      const keyPart = f.key ? chalk.bold(f.key) + ': ' : '';
      console.log(`  ${icon} ${keyPart}${color(f.message)}`);
    }
  }

  console.log('');
  console.log(hr());

  // ── Health score ─────────────────────────────────────────────────────────
  const scoreColor =
    report.healthScore >= 75 ? chalk.green :
    report.healthScore >= 50 ? chalk.yellow :
    chalk.red;

  console.log('');
  console.log(
    chalk.bold('Environment Health: ') +
    scoreColor.bold(`${report.healthScore}/100`) +
    '  ' +
    chalk.gray(`[${grade}] ${label}`)
  );
  console.log('');
  console.log(`  ${chalk.green('Passed:')}   ${report.passed}`);
  console.log(`  ${chalk.yellow('Warnings:')} ${report.warnings}`);
  console.log(`  ${chalk.red('Errors:')}   ${report.errors}`);

  if (report.securityFindings.length > 0) {
    console.log(`  ${chalk.magenta('Security:')} ${report.securityFindings.length} finding(s)`);
  }

  console.log('');
  console.log(hr());

  // ── Suggested fixes ───────────────────────────────────────────────────────
  if (report.suggestedFixes.length > 0) {
    console.log('');
    console.log(chalk.bold.yellow('Suggested Fixes:'));
    report.suggestedFixes.forEach((fix, i) => {
      console.log(`  ${chalk.gray(`${i + 1}.`)} ${fix}`);
    });
    console.log('');
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  console.log(chalk.bold.cyan('Diagnostic completed.'));
  console.log('');
}

/**
 * Renders the output of a comparison between two env files.
 * @param {import('../analyzers/comparator.js').CompareResult} result
 */
export function renderComparison(result) {
  console.log('');
  console.log(chalk.bold.cyan('╔══════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║') + chalk.bold.white('         🩺  ENV DOCTOR COMPARE               ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.bold('Base:    ') + chalk.underline(result.baseFile));
  console.log(chalk.bold('Compare: ') + chalk.underline(result.compareFile));
  console.log(hr());

  if (result.findings.length === 0) {
    console.log(chalk.green('\n✓ Both files are in sync.\n'));
    return;
  }

  console.log('');
  for (const f of result.findings) {
    const icon = severityIcon(f.severity);
    const color = severityColor(f.severity);
    console.log(`  ${icon} ${chalk.bold(f.key || '')}: ${color(f.message)}`);
  }

  console.log('');
  console.log(hr());
  console.log(`  Missing in compare:  ${chalk.red(result.missingInCompare.length)}`);
  console.log(`  Extra in compare:    ${chalk.yellow(result.extraInCompare.length)}`);
  console.log(`  Empty in compare:    ${chalk.yellow(result.emptyInCompare.length)}`);
  console.log('');
}

/**
 * Renders a simple success/info message.
 * @param {string} msg
 */
export function renderSuccess(msg) {
  console.log(chalk.green(`✓ ${msg}`));
}

/**
 * Renders an error message.
 * @param {string} msg
 */
export function renderError(msg) {
  console.error(chalk.red(`✗ ${msg}`));
}

