import { describe, it, expect } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, '..', 'bin', 'cli.js');
const fixturesDir = join(__dirname, 'fixtures');

describe('CLI Commands', () => {
  it('displays version with -v', async () => {
    const { stdout } = await execAsync(`node "${cliPath}" -v`);
    expect(stdout.trim()).toBe('1.0.0');
  });

  it('displays help with --help', async () => {
    const { stdout } = await execAsync(`node "${cliPath}" --help`);
    expect(stdout).toContain('env-doctor');
    expect(stdout).toContain('check');
    expect(stdout).toContain('compare');
    expect(stdout).toContain('security');
    expect(stdout).toContain('generate-example');
    expect(stdout).toContain('report');
  });

  it('runs check command with json output', async () => {
    const envFile = join(fixturesDir, '.env.test');
    // Notice exit code could be 0 or 1 depending on whether errors exist in fixture
    try {
      const { stdout } = await execAsync(
        `node "${cliPath}" check --file "${envFile}" --format json --no-git`
      );
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty('healthScore');
      expect(parsed).toHaveProperty('findings');
    } catch (err) {
      if (err.stdout) {
        const parsed = JSON.parse(err.stdout);
        expect(parsed).toHaveProperty('healthScore');
        expect(parsed).toHaveProperty('findings');
      } else {
        throw err;
      }
    }
  });

  it('runs compare command with json output', async () => {
    const devFile = join(fixturesDir, '.env.development');
    const prodFile = join(fixturesDir, '.env.production');
    try {
      const { stdout } = await execAsync(
        `node "${cliPath}" compare "${devFile}" "${prodFile}" --format json`
      );
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty('missingInCompare');
      expect(parsed).toHaveProperty('extraInCompare');
    } catch (err) {
      if (err.stdout) {
        const parsed = JSON.parse(err.stdout);
        expect(parsed).toHaveProperty('missingInCompare');
      } else {
        throw err;
      }
    }
  });

  it('runs generate-example command', async () => {
    const devFile = join(fixturesDir, '.env.development');
    const tmpOut = join('/tmp', `env-doctor-cli-example-${Date.now()}.env`);
    const { stdout } = await execAsync(
      `node "${cliPath}" generate-example --file "${devFile}" --output "${tmpOut}" --overwrite`
    );
    expect(stdout).toContain('Generated');
  });

  it('exits with code 2 on missing file', async () => {
    await expect(
      execAsync(`node "${cliPath}" check --file "/nonexistent/.env"`)
    ).rejects.toMatchObject({ code: 2 });
  });
});

