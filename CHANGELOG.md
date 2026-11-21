# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release of EnvDoctor
- Environment variable scanner — read and parse `.env` files
- Validation engine — required, type, format, and custom rules
- Security scanner — weak secrets, placeholder detection, Git tracking check
- Duplicate variable detector
- Unused variable detector (JS/TS project scan)
- Environment comparator — diff multiple `.env` files
- Example generator — produce `.env.example` without exposing secrets
- Diagnostic reporter — terminal, JSON, and HTML output formats
- Health score — 0–100 score with explainable breakdown
- CLI tool — `env-doctor check|scan|compare|security|generate-example|report`
- Full test suite with Vitest
- GitHub Actions CI workflow

