# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x   | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability in EnvDoctor, please **do not** open a public GitHub issue.

Instead, email the maintainers directly or use GitHub's private vulnerability reporting feature.

We will respond within 72 hours and aim to release a fix within 7 days of confirmation.

## Security Design Principles

EnvDoctor is designed with security as a first-class concern:

- **No value exposure**: Environment variable values are never printed, logged, or included in reports. Only key names are shown.
- **Sensitive key detection**: Keys matching patterns like `SECRET`, `PASSWORD`, `TOKEN`, `API_KEY`, etc. are automatically redacted.
- **No file modification**: EnvDoctor only reads environment files; it never modifies or deletes them.
- **Git tracking detection**: EnvDoctor warns when `.env` files are tracked by Git.
- **No network calls**: EnvDoctor operates entirely locally with no external network requests.

