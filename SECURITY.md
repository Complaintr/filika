<p align="left">
  <img src="filika.png" alt="Filika Logo" width="120">
</p>

# Security Policy

## Supported Versions

Currently, only the latest commit on the `main` branch is actively supported with security updates.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Instead, send a private message to the repository maintainers. We take all security vulnerabilities seriously and will work to address them promptly.

## Architecture and Safety

Filika is built with privacy and safety by default:
1. **Zero ambient capture**: Filika never inspects the DOM, session storage, cookies, user input fields, or network logs outside of explicit tool execution.
2. **Closed input schema**: Payloads with unexpected properties are rejected immediately at the collector boundary.
3. **Payload limits**: Strict limits on payload size prevent denial of service or storage exhaustion.
