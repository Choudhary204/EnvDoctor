#!/usr/bin/env node

/**
 * @file cli.js
 * @description EnvDoctor CLI — env-doctor check|scan|compare|security|generate-example|report
 */

import { program } from 'commander';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { diagnose } from '../src/core/engine.js';
import { scan } from '../src/core/scanner.js';
import { compareEnvFiles, compareMultiple } from '../src/analyzers/comparator.js';
import { generateExample } from '../src/reporters/example-generator.js';
import { renderTerminal, renderComparison, renderSuccess, renderError } from '../src/reporters/terminal.js';
import { renderJSON, renderComparisonJSON } from '../src/reporters/json.js';
import { renderHTML } from '../src/reporters/html.js';
import chalk from 'chalk';

// ── Package version ───────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  await readFile(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .name('env-doctor')
  .description('🩺 Smart environment configuration diagnostics for Node.js apps')
  .version(pkg.version, '-v, --version');

// ─────────────────────────────────────────────────────────────────────────────
// check / scan  (aliases)
// ─────────────────────────────────────────────────────────────────────────────
const checkCommand = (name) =>
  program
    .command(name)
    .description('Scan an environment file and run all diagnostics')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('--format <format>', 'Output format: terminal | json | html', 'terminal')
    .option('--output <file>', 'Write output to a file (for json/html)')
    .option('--verbose', 'Show passing checks too', false)
    .option('--no-git', 'Skip Git tracking check')
    .option('--detect-unused', 'Scan source files for unused variables', false)
    .option('--project-root <dir>', 'Root directory for unused-variable scan', '.')
    .option('--required <keys>', 'Comma-separated list of required variable names', '')
    .action(async (opts) => {
      try {
        const required = opts.required
          ? opts.required.split(',').map((k) => k.trim()).filter(Boolean)
          : [];

        const report = await diagnose({
          filePath: opts.file,
          required,
          checkGit: opts.git,
          detectUnusedVars: opts.detectUnused,
          projectRoot: opts.projectRoot,
        });

        await outputReport(report, opts.format, opts.output, opts.verbose);

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        renderError(err.message);
        process.exit(2);
      }
    });

checkCommand('check');
checkCommand('scan');

// ─────────────────────────────────────────────────────────────────────────────
// compare
// ─────────────────────────────────────────────────────────────────────────────
program
  .command('compare [files...]')
  .description('Compare two or more .env files')
  .option('--base <file>', 'Base file to compare against', '.env')
  .option('--format <format>', 'Output format: terminal | json', 'terminal')
  .option('--output <file>', 'Write output to a file')
  .action(async (files, opts) => {
    try {
      let baseFile = opts.base;
      let compareFiles = files;

      // Allow positional: env-doctor compare .env.development .env.production
      if (files.length >= 2 && opts.base === '.env') {
        baseFile = files[0];
        compareFiles = files.slice(1);
      } else if (files.length === 0) {
        // Default: compare .env against .env.development, .env.production, .env.test
        compareFiles = ['.env.development', '.env.production', '.env.test'].filter(
          (f) => { try { require('node:fs').accessSync(f); return true; } catch { return false; } }
        );
      }

      const results = await compareMultiple(baseFile, compareFiles);

      for (const result of results) {
        if (opts.format === 'json') {
          const out = renderComparisonJSON(result);
          if (opts.output) {
            await writeFile(resolve(opts.output), out, 'utf8');
            renderSuccess(`JSON comparison saved to ${opts.output}`);
          } else {
            console.log(out);
          }
        } else {
          renderComparison(result);
        }
      }

      const hasErrors = results.some((r) => r.findings.some((f) => f.severity === 'error'));
      process.exit(hasErrors ? 1 : 0);
    } catch (err) {
      renderError(err.message);
      process.exit(2);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// security
// ─────────────────────────────────────────────────────────────────────────────
program
  .command('security')
  .description('Run security-focused checks only (weak secrets, Git tracking)')
  .option('-f, --file <path>', 'Path to .env file', '.env')
  .option('--format <format>', 'Output format: terminal | json', 'terminal')
  .action(async (opts) => {
    try {
      const report = await diagnose({ filePath: opts.file, checkGit: true });

      // Filter to only security findings
      const secReport = {
        ...report,
        findings: report.securityFindings,
      };

      if (opts.format === 'json') {
        console.log(renderJSON(secReport));
      } else {
        renderTerminal(secReport);
      }

      process.exit(report.securityFindings.some((f) => f.severity === 'error') ? 1 : 0);
    } catch (err) {
      renderError(err.message);
      process.exit(2);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// generate-example
// ─────────────────────────────────────────────────────────────────────────────
program
  .command('generate-example')
  .description('Generate a .env.example file from an existing .env file')
  .option('-f, --file <path>', 'Path to source .env file', '.env')
  .option('-o, --output <path>', 'Output path for .env.example', '.env.example')
  .option('--overwrite', 'Overwrite output file if it exists', false)
  .action(async (opts) => {
    try {
      const { outputPath, keys } = await generateExample({
        inputPath: opts.file,
        outputPath: opts.output,
        overwrite: opts.overwrite,
      });
      renderSuccess(
        `Generated ${outputPath} with ${keys.length} variable(s). Real values have been redacted.`
      );
      process.exit(0);
    } catch (err) {
      renderError(err.message);
      process.exit(2);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// report
// ─────────────────────────────────────────────────────────────────────────────
program
  .command('report')
  .description('Generate a full diagnostic report (terminal | json | html)')
  .option('-f, --file <path>', 'Path to .env file', '.env')
  .option('--format <format>', 'Output format: terminal | json | html', 'html')
  .option('-o, --output <file>', 'Output file path (auto-named if omitted)')
  .option('--verbose', 'Show passing checks too', false)
  .action(async (opts) => {
    try {
      const report = await diagnose({ filePath: opts.file, checkGit: true });
      const defaultOutput =
        opts.format === 'html' ? 'env-doctor-report.html' :
        opts.format === 'json' ? 'env-doctor-report.json' : null;
      await outputReport(report, opts.format, opts.output || defaultOutput, opts.verbose);
      process.exit(report.errors > 0 ? 1 : 0);
    } catch (err) {
      renderError(err.message);
      process.exit(2);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Routes a report to the correct output format and destination.
 */
async function outputReport(report, format, outputFile, verbose) {
  if (format === 'json') {
    const out = renderJSON(report);
    if (outputFile) {
      await writeFile(resolve(outputFile), out, 'utf8');
      renderSuccess(`JSON report saved to ${outputFile}`);
    } else {
      console.log(out);
    }
  } else if (format === 'html') {
    const out = renderHTML(report);
    const dest = outputFile || 'env-doctor-report.html';
    await writeFile(resolve(dest), out, 'utf8');
    renderSuccess(`HTML report saved to ${dest}`);
  } else {
    renderTerminal(report, { verbose });
  }
}

program.parse(process.argv);

