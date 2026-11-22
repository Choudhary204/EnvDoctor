# 🩺 EnvDoctor

> Smart environment configuration diagnostics for Node.js applications.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online%20Playground-38bdf8?style=for-the-badge&logo=googlechrome&logoColor=white)](https://choudhary204.github.io/EnvDoctor/)
[![npm version](https://img.shields.io/npm/v/@choudhary204/env-doctor.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@choudhary204/env-doctor)
[![CI](https://github.com/Choudhary204/EnvDoctor/actions/workflows/ci.yml/badge.svg)](https://github.com/Choudhary204/EnvDoctor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

EnvDoctor scans, validates, diagnoses, and reports issues in your `.env` files **before** they cause application crashes, deployment failures, or security problems.

Think of it as a **health-check system for your environment configuration**.

---

## 🌐 Live Interactive Demo

Try EnvDoctor directly in your browser with zero installation:

👉 **[https://choudhary204.github.io/EnvDoctor/](https://choudhary204.github.io/EnvDoctor/)**

- ⚡ **Interactive Diagnostics:** Test health score grading (0–100, A–F) with immediate feedback.
- 🔒 **Zero Data Leakage:** 100% client-side — your secrets never leave your browser.
- 📄 **.env.example Generator:** Create safe template files instantly with one click.
- 📊 **Multi-Env Comparator:** Side-by-side diffing between development, staging, and production.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **Scanner** | Reads `.env` files, detects missing/empty/malformed values |
| ✅ **Validator** | Validates types (`number`, `boolean`, `url`, `port`, `email`), lengths, patterns, enums |
| 🔒 **Security Scanner** | Detects weak secrets, placeholder values, Git tracking |
| 🔁 **Duplicate Detector** | Finds duplicate variable definitions |
| 📊 **Comparator** | Diffs `.env.development` vs `.env.production` etc. |
| 🕵️ **Unused Detector** | Finds env vars never referenced in source code |
| 📄 **Example Generator** | Creates `.env.example` without exposing real values |
| 📈 **Health Score** | 0–100 score with an A–F grade and explainable breakdown |
| 🎨 **Multiple Formats** | Terminal (coloured), JSON, HTML reports |
| 🖥️ **CLI** | Full-featured command-line tool |

**Security first** — EnvDoctor **never** exposes actual secret values in any output.

---

## Requirements

- **Node.js >= 18.0.0**

---

## Installation

```bash
# As a local dependency
npm install @choudhary204/env-doctor

# Or globally for CLI use
npm install -g @choudhary204/env-doctor
```

---

## CLI Usage

### Quick health check

```bash
npx @choudhary204/env-doctor check
npx @choudhary204/env-doctor check --file .env.production
npx @choudhary204/env-doctor check --format json
npx @choudhary204/env-doctor check --format json --output report.json
npx @choudhary204/env-doctor check --verbose
```

### Scan (alias for check)

```bash
npx @choudhary204/env-doctor scan --file .env.staging
```

### Compare environment files

```bash
# Compare .env.development against .env.production
npx @choudhary204/env-doctor compare .env.development .env.production

# Compare with explicit base
npx @choudhary204/env-doctor compare --base .env.development .env.production .env.test
```

### Security check

```bash
npx @choudhary204/env-doctor security
npx @choudhary204/env-doctor security --file .env.production
npx @choudhary204/env-doctor security --format json
```

### Generate .env.example

```bash
npx @choudhary204/env-doctor generate-example
npx @choudhary204/env-doctor generate-example --file .env.production --output .env.example
npx @choudhary204/env-doctor generate-example --overwrite
```

### Full report

```bash
npx @choudhary204/env-doctor report                        # HTML (default)
npx @choudhary204/env-doctor report --format json
npx @choudhary204/env-doctor report --format terminal
npx @choudhary204/env-doctor report --output custom.html
```

### CLI options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Path to `.env` file (default: `.env`) |
| `--format <fmt>` | `terminal` \| `json` \| `html` |
| `--output <file>` | Save output to a file |
| `--verbose` | Show passing checks |
| `--no-git` | Skip Git tracking check |
| `--detect-unused` | Scan source files for unused variables |
| `--required <keys>` | Comma-separated required keys |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | One or more errors found |
| `2` | Fatal error (file not found, permission denied, etc.) |

---

## Library Usage

```js
import { diagnose } from 'env-doctor';

const report = await diagnose({
  filePath: '.env',                        // path to your env file
  required: ['PORT', 'DATABASE_URL', 'JWT_SECRET'],
  rules: {
    PORT: 'port',
    DATABASE_URL: 'url',
    JWT_SECRET: { type: 'string', minLength: 32 },
    NODE_ENV: { enum: ['development', 'production', 'test'] },
    DEBUG: 'boolean',
  },
  checkGit: true,       // detect if .env is tracked by git
  detectUnusedVars: false,
});

console.log('Health Score:', report.healthScore); // 0–100
console.log('Errors:', report.errors);
console.log('Suggested Fixes:', report.suggestedFixes);
```

### CommonJS (CJS) Compatibility

EnvDoctor is distributed as a standard ES Module. To use it in CommonJS projects (`require`), use dynamic `import()`:

```js
// CommonJS (.cjs or without "type": "module")
async function runDiagnostics() {
  const { diagnose } = await import('env-doctor');
  const report = await diagnose({
    filePath: '.env',
    required: ['PORT', 'DATABASE_URL'],
  });
  console.log(report);
}

runDiagnostics();
```


### DiagnosticReport shape

```js
{
  filePath: string,          // resolved file path
  totalVars: number,         // total variables in file
  passed: number,            // checks that passed
  warnings: number,
  errors: number,
  healthScore: number,       // 0–100
  scoreBreakdown: Object,    // itemised deduction log
  keys: string[],            // all variable names
  findings: Finding[],       // all findings (see below)
  securityFindings: Finding[],
  suggestedFixes: string[],
  meta: Object,
}
```

### Finding shape

```js
{
  severity: 'error' | 'warning' | 'pass' | 'info',
  code: string,      // e.g. 'MISSING_REQUIRED', 'INVALID_TYPE', 'WEAK_SECRET'
  key: string,       // variable name
  line?: number,     // line number if applicable
  message: string,   // human-readable description — never contains actual values
}
```

### Validation rules

```js
// Shorthand — just a type name
rules: {
  PORT: 'port',
  DATABASE_URL: 'url',
  DEBUG: 'boolean',
  COUNT: 'number',
  EMAIL: 'email',
}

// Full rule object
rules: {
  JWT_SECRET: {
    type: 'string',
    minLength: 32,
    maxLength: 512,
  },
  VERSION: {
    pattern: '^\\d+\\.\\d+\\.\\d+$',
  },
  NODE_ENV: {
    enum: ['development', 'production', 'test'],
  },
}
```

### Available types

| Type | Valid values |
|------|-------------|
| `string` | Any non-empty string |
| `number` | Any numeric value |
| `integer` | Whole numbers only |
| `boolean` | `true`, `false`, `1`, `0`, `yes`, `no` |
| `url` | Valid HTTP, HTTPS, or database URLs |
| `port` | Integer 1–65535 |
| `email` | Valid email format |

### Individual module imports

```js
import { scan } from 'env-doctor';
import { compareEnvFiles, compareMultiple } from 'env-doctor';
import { generateExample } from 'env-doctor';
import { renderTerminal, renderJSON, renderHTML } from 'env-doctor';
import { detectWeakSecrets } from 'env-doctor';
import { detectDuplicates } from 'env-doctor';
import { gradeScore } from 'env-doctor';
```

---

## Health Score

The health score is calculated using documented, deterministic rules:

| Deduction | Per occurrence | Cap |
|-----------|---------------|-----|
| Each error | -15 pts | max -60 |
| Each warning | -5 pts | max -25 |
| Each security finding | -10 pts | max -30 |
| Each missing required variable | -10 pts (extra) | max -20 |

| Score | Grade | Label |
|-------|-------|-------|
| 90–100 | A | Excellent |
| 75–89 | B | Good |
| 60–74 | C | Fair |
| 40–59 | D | Poor |
| 0–39 | F | Critical |

---

## Example Terminal Output

```
╔══════════════════════════════════════════════╗
║            🩺  ENV DOCTOR                    ║
║        Environment Diagnostics v1.0          ║
╚══════════════════════════════════════════════╝

File: /project/.env
Variables found: 8

Scanning environment configuration...
──────────────────────────────────────────────────

  ✗ DATABASE_URL: DATABASE_URL is required but not defined in the environment file
  ⚠ API_KEY: API_KEY contains a placeholder value. Replace it with a real secret.
  ✗ JWT_SECRET: JWT_SECRET appears to be a weak secret: too short (3 chars, minimum 16).

──────────────────────────────────────────────────

Environment Health: 55/100  [D] Poor

  Passed:   5
  Warnings: 1
  Errors:   2

──────────────────────────────────────────────────

Suggested Fixes:
  1. Add DATABASE_URL to your environment file.
  2. Replace the placeholder value of API_KEY with a real value.
  3. Replace the weak/placeholder value of JWT_SECRET with a strong secret.

Diagnostic completed.
```

---

## Security Design

- ❌ Values are **never** printed, logged, or included in reports
- 🔒 Sensitive keys (SECRET, PASSWORD, TOKEN, API_KEY, etc.) are always `[REDACTED]`
- 📁 EnvDoctor **only reads** env files — it never modifies or deletes them
- 🌐 **No network calls** — everything runs locally
- 🚫 Git tracking detection warns when `.env` files are accidentally committed

---

## CI/CD Integration

EnvDoctor exits with code `1` on errors, making it suitable for CI pipelines:

```yaml
# GitHub Actions example
- name: Check environment configuration
  run: npx env-doctor check --file .env.production --required PORT,DATABASE_URL,JWT_SECRET
```

---

## Publishing to npm

This package is **ready to publish** but has not been published yet. Before publishing:

1. **Check name availability:**
   ```bash
   npm view env-doctor
   # If 404 → name is available
   ```

2. **Login to npm:**
   ```bash
   npm login
   ```

3. **Publish:**
   ```bash
   npm publish --access public
   ```

4. **Verify:**
   ```bash
   npx env-doctor --version
   ```

> **Note:** Update the `repository.url`, `bugs.url`, and `homepage` fields in `package.json` with your actual GitHub username before publishing.

---

## Development

```bash
git clone https://github.com/Choudhary204/env-doctor.git
cd env-doctor
npm install
npm test
npm run test:coverage
```

---

## Project Structure

```
env-doctor/
├── bin/cli.js                    # CLI entry point
├── src/
│   ├── core/
│   │   ├── parser.js             # .env file parser
│   │   ├── scanner.js            # surface-level scanner
│   │   └── engine.js             # orchestration / diagnose()
│   ├── validators/
│   │   ├── required.js           # required variable checks
│   │   ├── types.js              # type validation
│   │   └── format.js             # length, pattern, enum checks
│   ├── security/
│   │   ├── secrets.js            # weak secret / placeholder detection
│   │   └── git-check.js          # Git tracking check
│   ├── analyzers/
│   │   ├── duplicate.js          # duplicate key detection
│   │   ├── unused.js             # unused variable detection
│   │   └── comparator.js         # multi-file comparison
│   ├── reporters/
│   │   ├── terminal.js           # coloured terminal output
│   │   ├── json.js               # JSON serialisation
│   │   ├── html.js               # self-contained HTML report
│   │   ├── score.js              # health score computation
│   │   └── example-generator.js  # .env.example generator
│   └── index.js                  # public API
├── test/
│   ├── fixtures/                 # test .env files
│   ├── parser.test.js
│   ├── scanner.test.js
│   ├── validators.test.js
│   ├── security.test.js
│   ├── analyzers.test.js
│   ├── comparator.test.js
│   ├── engine.test.js
│   └── reporters.test.js
├── examples/
│   ├── basic-usage.js
│   └── advanced-usage.js
├── .github/workflows/ci.yml
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## License

MIT © EnvDoctor Contributors

