/**
 * @file git-check.js
 * @description Checks whether .env files are tracked by Git, which is a
 * security risk as secrets would be exposed in the repository history.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { basename } from 'node:path';

const execAsync = promisify(exec);

/**
 * Checks if the given file is tracked by Git.
 * @param {string} filePath - resolved file path
 * @returns {Promise<import('../core/scanner.js').ScanFinding[]>}
 */
export async function checkGitTracking(filePath) {
  const findings = [];
  const fileName = basename(filePath);

  try {
    // `git ls-files --error-unmatch` exits 1 if the file is NOT tracked
    await execAsync(`git ls-files --error-unmatch "${filePath}"`, {
      cwd: process.cwd(),
      timeout: 5000,
    });

    // If we reach here, the file IS tracked — that's a problem
    findings.push({
      severity: 'error',
      code: 'GIT_TRACKED',
      key: '',
      message: `${fileName} is tracked by Git. Environment files with secrets should never be committed. Add it to .gitignore and run: git rm --cached ${fileName}`,
    });
  } catch (err) {
    if (err.code === 1) {
      // File is not tracked — good
      findings.push({
        severity: 'pass',
        code: 'GIT_NOT_TRACKED',
        key: '',
        message: `${fileName} is not tracked by Git ✓`,
      });
    } else if (err.message && err.message.includes('not a git repository')) {
      // Not a git repo — info only
      findings.push({
        severity: 'info',
        code: 'NO_GIT_REPO',
        key: '',
        message: 'No Git repository found. Git tracking check skipped.',
      });
    } else {
      // Git not installed or other error
      findings.push({
        severity: 'info',
        code: 'GIT_CHECK_SKIPPED',
        key: '',
        message: 'Could not check Git tracking (Git may not be installed or accessible).',
      });
    }
  }

  // Also check .gitignore for the file name
  try {
    const { stdout } = await execAsync(`git check-ignore -q "${filePath}"`, {
      cwd: process.cwd(),
      timeout: 5000,
    });
    // exit 0 means file IS ignored — good
    findings.push({
      severity: 'pass',
      code: 'GITIGNORED',
      key: '',
      message: `${fileName} is listed in .gitignore ✓`,
    });
  } catch {
    // exit 1 means NOT ignored — warning
    const alreadyTrackedError = findings.some((f) => f.code === 'GIT_TRACKED');
    if (!alreadyTrackedError) {
      findings.push({
        severity: 'warning',
        code: 'NOT_GITIGNORED',
        key: '',
        message: `${fileName} is not listed in .gitignore. Add it to prevent accidental commits.`,
      });
    }
  }

  return findings;
}

