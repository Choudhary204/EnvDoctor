# Contributing to EnvDoctor

Thank you for considering contributing to EnvDoctor! 🩺

## Development Setup

```bash
git clone https://github.com/Choudhary204/env-doctor.git
cd env-doctor
npm install
npm test
```

## Code Style

- ES Modules (`import`/`export`) throughout
- JSDoc comments on all public functions
- Descriptive variable names; no magic numbers
- Never log or expose actual environment variable values in any output

## Running Tests

```bash
npm test               # run all tests
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

## Submitting a PR

1. Fork the repo and create a branch (`feature/my-feature` or `fix/my-bug`).
2. Write tests for new functionality.
3. Make sure all tests pass.
4. Open a pull request against `main`.

## Security

If you discover a security vulnerability, please report it via [SECURITY.md](SECURITY.md).

## License

By contributing, you agree your contributions are licensed under the MIT License.

