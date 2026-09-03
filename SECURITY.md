# Security

<p align="left">
  <img src="filika.png" alt="Filika" width="800">
</p>

Security reports help us protect Filika users, connected applications, and the wider WebMCP ecosystem. If you believe you have found a vulnerability, please report it privately and give us a reasonable opportunity to investigate before sharing it publicly.

## Report a Security Vulnerability

Email security reports to [security@complaintr.com](mailto:security@complaintr.com).

Use a clear subject such as `Security report: short description`. Please include as much of the following information as possible:

- The affected component, route, feature, or repository path.
- A description of the vulnerability and its potential impact.
- Reproduction steps or a minimal proof of concept.
- The conditions required to reproduce the issue.
- Any suggested mitigation, if you have one.
- Your preferred name and contact details for follow-up or credit.

Do not include credentials, private keys, access tokens, personal data, or data belonging to other users in your report. If sensitive supporting material is necessary, mention it in your first email so we can arrange an appropriate way to receive it.

Please do not report vulnerabilities through public GitHub issues, discussions, pull requests, or social media.

## What to Report

We welcome reports about vulnerabilities that could compromise the confidentiality, integrity, or availability of Filika or its users. Examples include:

- Authentication or authorization bypasses.
- Cross-tenant access to another user's applications or feedback.
- Exposure of credentials, session data, personal information, or private reports.
- Origin validation bypasses that allow unauthorized websites to submit feedback.
- Injection vulnerabilities, remote code execution, or unsafe request handling.
- WebMCP tool behavior that permits unintended access to page or browser data.
- Server-side request forgery, path traversal, or insecure file access.
- Cross-site scripting, cross-site request forgery, or session fixation.
- Vulnerable dependencies with a demonstrated impact on Filika.
- Abuse of the feedback collector that causes a meaningful security impact.

## What Not to Report

The following are generally not security vulnerabilities unless they create a concrete security impact:

- Product bugs, feature requests, usability problems, or documentation errors.
- Automated scanner output without validation or reproduction steps.
- Missing security headers without a demonstrated exploit.
- Rate-limit observations that do not lead to authentication bypass, data exposure, or material service disruption.
- Social engineering, phishing, or attacks requiring physical access to a user's device.
- Issues that affect unsupported local modifications or outdated third-party deployments.
- Denial-of-service tests performed against production systems.

Use [GitHub Issues](https://github.com/Complaintr/filika/issues) for ordinary bugs and feature requests that do not contain sensitive information.

## Safe Testing

When investigating a potential vulnerability:

1. Test only with accounts, applications, and data that you own or have explicit permission to use.
2. Use the minimum activity necessary to demonstrate the issue.
3. Do not access, modify, retain, or disclose another person's data.
4. Do not disrupt the service, degrade availability, send spam, or perform destructive testing.
5. Stop testing and contact us if you encounter sensitive data or gain unintended access.

## What to Expect

We will acknowledge a complete report within three business days. We will then assess its severity, confirm whether it is reproducible, and keep you informed of material progress. Resolution time depends on complexity and impact.

Please coordinate public disclosure with us. Once a fix is available and affected users have had a reasonable opportunity to update, we will work with you on appropriate disclosure and credit. We may be unable to provide updates or attribution for reports that do not include a reliable contact method.

Filika does not currently operate a paid bug bounty program. Submitting a report does not guarantee payment or other compensation.
