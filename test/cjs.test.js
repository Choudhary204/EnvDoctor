import { describe, it, expect } from 'vitest';

describe('CommonJS Dynamic Import Compatibility', () => {
  it('loads module via dynamic import()', async () => {
    const envDoctor = await import('../src/index.js');
    expect(envDoctor).toHaveProperty('diagnose');
    expect(envDoctor).toHaveProperty('scan');
    expect(envDoctor).toHaveProperty('compareEnvFiles');
    expect(envDoctor).toHaveProperty('generateExample');
  });
});

