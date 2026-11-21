import { describe, it, expect } from 'vitest';
import { detectWeakSecrets } from '../src/security/secrets.js';

describe('detectWeakSecrets', () => {
  it('detects placeholder values', () => {
    const findings = detectWeakSecrets({ API_KEY: 'your_api_key_here' }, ['API_KEY']);
    expect(findings.some((f) => f.code === 'PLACEHOLDER_VALUE')).toBe(true);
  });

  it('detects common placeholder patterns', () => {
    const placeholders = [
      'your_secret_here',
      'change_me',
      'changeme',
      'example',
      'placeholder',
      'TODO',
      '<MY_SECRET>',
      '[MY_SECRET]',
      'xxxxxxxx',
      'password',
      'secret',
      '123456',
    ];
    for (const val of placeholders) {
      const findings = detectWeakSecrets({ JWT_SECRET: val }, ['JWT_SECRET']);
      expect(
        findings.some((f) => f.code === 'PLACEHOLDER_VALUE' || f.code === 'WEAK_SECRET'),
        `Expected "${val}" to be flagged`
      ).toBe(true);
    }
  });

  it('flags weak (too short) secrets', () => {
    const findings = detectWeakSecrets({ JWT_SECRET: 'abc' }, ['JWT_SECRET']);
    expect(findings.some((f) => f.code === 'WEAK_SECRET')).toBe(true);
  });

  it('does NOT flag a strong secret', () => {
    const findings = detectWeakSecrets(
      { JWT_SECRET: 'x7#K9$mN2pQrL5vW8aZ3bYcD6eFgHiJk' },
      ['JWT_SECRET']
    );
    expect(findings.filter((f) => f.severity === 'error' || f.severity === 'warning')).toHaveLength(0);
  });

  it('never includes the actual value in the finding message', () => {
    const secretValue = 'my-super-secret-do-not-expose-me-ever';
    const findings = detectWeakSecrets({ API_KEY: secretValue }, ['API_KEY']);
    for (const f of findings) {
      expect(f.message).not.toContain(secretValue);
    }
  });

  it('does not flag non-secret keys as weak even with simple values', () => {
    const findings = detectWeakSecrets({ NODE_ENV: 'dev' }, ['NODE_ENV']);
    expect(findings.filter((f) => f.code === 'WEAK_SECRET')).toHaveLength(0);
  });

  it('skips empty values', () => {
    const findings = detectWeakSecrets({ JWT_SECRET: '' }, ['JWT_SECRET']);
    expect(findings).toHaveLength(0);
  });
});

