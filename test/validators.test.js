import { describe, it, expect } from 'vitest';
import { validateRequired } from '../src/validators/required.js';
import { validateTypes } from '../src/validators/types.js';
import { validateFormats } from '../src/validators/format.js';

// ── Required ────────────────────────────────────────────────────────────────
describe('validateRequired', () => {
  it('passes when all required vars are present', () => {
    const findings = validateRequired(['PORT', 'NODE_ENV'], { PORT: '3000', NODE_ENV: 'dev' }, ['PORT', 'NODE_ENV']);
    expect(findings.every((f) => f.severity === 'pass')).toBe(true);
  });

  it('errors when a required var is missing', () => {
    const findings = validateRequired(['JWT_SECRET'], {}, []);
    const f = findings.find((f) => f.code === 'MISSING_REQUIRED');
    expect(f).toBeDefined();
    expect(f.severity).toBe('error');
    expect(f.key).toBe('JWT_SECRET');
  });

  it('errors when a required var is empty', () => {
    const findings = validateRequired(['API_KEY'], { API_KEY: '' }, ['API_KEY']);
    const f = findings.find((f) => f.code === 'MISSING_REQUIRED');
    expect(f).toBeDefined();
  });

  it('returns empty array when no required vars specified', () => {
    expect(validateRequired([], {}, [])).toHaveLength(0);
  });
});

// ── Types ────────────────────────────────────────────────────────────────────
describe('validateTypes', () => {
  it('passes a valid number', () => {
    const findings = validateTypes({ PORT: 'number' }, { PORT: '3000' });
    expect(findings[0].severity).toBe('pass');
  });

  it('errors on an invalid number', () => {
    const findings = validateTypes({ PORT: 'number' }, { PORT: 'notanumber' });
    expect(findings[0].code).toBe('INVALID_TYPE');
  });

  it('passes a valid boolean (true)', () => {
    const findings = validateTypes({ DEBUG: 'boolean' }, { DEBUG: 'true' });
    expect(findings[0].severity).toBe('pass');
  });

  it('passes boolean values: false, 1, 0, yes, no', () => {
    for (const v of ['false', '1', '0', 'yes', 'no']) {
      const findings = validateTypes({ F: 'boolean' }, { F: v });
      expect(findings[0].severity).toBe('pass');
    }
  });

  it('errors on an invalid boolean', () => {
    const findings = validateTypes({ DEBUG: 'boolean' }, { DEBUG: 'maybe' });
    expect(findings[0].code).toBe('INVALID_TYPE');
  });

  it('passes a valid URL', () => {
    const findings = validateTypes({ DB: 'url' }, { DB: 'postgresql://localhost:5432/mydb' });
    expect(findings[0].severity).toBe('pass');
  });

  it('errors on an invalid URL', () => {
    const findings = validateTypes({ DB: 'url' }, { DB: 'not-a-url' });
    expect(findings[0].code).toBe('INVALID_TYPE');
  });

  it('passes a valid port', () => {
    const findings = validateTypes({ PORT: 'port' }, { PORT: '8080' });
    expect(findings[0].severity).toBe('pass');
  });

  it('errors on port out of range', () => {
    const findings = validateTypes({ PORT: 'port' }, { PORT: '99999' });
    expect(findings[0].code).toBe('INVALID_TYPE');
  });

  it('passes a valid email', () => {
    const findings = validateTypes({ EMAIL: 'email' }, { EMAIL: 'admin@example.com' });
    expect(findings[0].severity).toBe('pass');
  });

  it('errors on an invalid email', () => {
    const findings = validateTypes({ EMAIL: 'email' }, { EMAIL: 'not-an-email' });
    expect(findings[0].code).toBe('INVALID_TYPE');
  });

  it('skips variables not present in env', () => {
    const findings = validateTypes({ MISSING: 'number' }, {});
    expect(findings).toHaveLength(0);
  });
});

// ── Formats ───────────────────────────────────────────────────────────────────
describe('validateFormats', () => {
  it('errors when value is shorter than minLength', () => {
    const findings = validateFormats({ SECRET: { minLength: 16 } }, { SECRET: 'short' });
    expect(findings[0].code).toBe('INVALID_FORMAT');
  });

  it('passes when value meets minLength', () => {
    const findings = validateFormats({ SECRET: { minLength: 4 } }, { SECRET: 'longvalue' });
    expect(findings[0].severity).toBe('pass');
  });

  it('errors when value exceeds maxLength', () => {
    const findings = validateFormats({ NAME: { maxLength: 5 } }, { NAME: 'toolongvalue' });
    expect(findings[0].code).toBe('INVALID_FORMAT');
  });

  it('errors on pattern mismatch', () => {
    const findings = validateFormats({ VERSION: { pattern: '^\\d+\\.\\d+\\.\\d+$' } }, { VERSION: 'not-semver' });
    expect(findings[0].code).toBe('INVALID_FORMAT');
  });

  it('passes on pattern match', () => {
    const findings = validateFormats({ VERSION: { pattern: '^\\d+\\.\\d+\\.\\d+$' } }, { VERSION: '1.2.3' });
    expect(findings[0].severity).toBe('pass');
  });

  it('errors on invalid enum value', () => {
    const findings = validateFormats({ ENV: { enum: ['development', 'production', 'test'] } }, { ENV: 'staging' });
    expect(findings[0].code).toBe('INVALID_FORMAT');
  });

  it('passes on valid enum value', () => {
    const findings = validateFormats({ ENV: { enum: ['development', 'production'] } }, { ENV: 'production' });
    expect(findings[0].severity).toBe('pass');
  });
});

