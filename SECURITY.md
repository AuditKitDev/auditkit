# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in AuditKit, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email **security@auditkit.dev** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Scope

This policy covers:

- The AuditKit API server (`apps/api`)
- The AuditKit web dashboard (`apps/web`)
- All published SDK packages (`@auditkit/*`)
- The hosted cloud service at `auditkit.dev`

## Security Practices

- All audit events are cryptographically chained (SHA-256 hash chain)
- Merkle tree proofs for tamper detection
- Encryption keys are encrypted at rest (AES-256)
- Session tokens are hashed before storage
- API keys are hashed (SHA-256) and only the prefix is stored
- SIEM credentials are encrypted with AES-256-GCM
- Rate limiting on all endpoints
- Input validation on all user-supplied data
