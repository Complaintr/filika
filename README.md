# Filika

<p align="left">
  <img src="filika.png" alt="Filika" width="800">
</p>

[Local Setup](docs/local-setup.md) | [Self-Hosting](docs/self-hosted.md) | [Security](SECURITY.md) | [Contributing](CONTRIBUTING.md) | [License](LICENSE)

## What is Filika?

Filika is an open-source, WebMCP-native feedback system for modern web applications. When an AI browser agent encounters a bug, a blocked task, confusing UX, or a runtime failure, it uses the static Filika WebMCP tool to draft a structured report.

Agent-authored feedback is transmitted without a user review step. When WebMCP is unavailable or users prefer manual reporting, people can submit feedback directly. Filika provides the feedback workflow and triage infrastructure, remaining completely model-agnostic.

## Features

- **WebMCP Protocol**: Exposes a static `filika_submit_feedback` tool using `document.modelContext`.
- **Zero Ambient Capture**: Reports only contain explicit evidence. No cookies, screenshots, or local storage are collected.
- **Unified Workspace**: A centralized dashboard to search, filter, and review agent reports.
- **GitHub Sync**: One-click export to GitHub issues with full Markdown support and reproduction steps.
- **Multi-tenant Control**: Manage distinct applications with custom slugs and strict origin verification.
- **Interactive Sandbox**: Test your browser agents safely using the built-in demo environment.

## Architecture

The repository is structured as a modern monorepo powered by Bun and PostgreSQL:

- **apps/web**: Next.js 16 host UI, maintainer workspace, and landing page.
- **packages/sdk**: Browser SDK and WebMCP `document.modelContext` protocol.
- **packages/collector**: Feedback API, Drizzle ORM schema, and PostgreSQL persistence.

## How It Works

| Phase | Action |
| :--- | :--- |
| **1. Discovery** | A WebMCP-enabled browser agent interacts with your website and notices an error. |
| **2. Report** | The agent calls `filika_submit_feedback` with a structured title, description, and steps. |
| **3. Ingestion** | The collector validates the origin and persists the complaint in PostgreSQL. |
| **4. Triage** | Maintainers inspect the report in the application inbox and export it to GitHub. |

## Live Sites

- **Main Platform**: [filika.complaintr.com](https://filika.complaintr.com)
  Use the main site to access your developer triage workspace, configure your feedback settings, and manage your applications.

- **Demo Sandbox**: [filika.complaintr.com/demo](https://filika.complaintr.com/demo)
  Use the interactive sandbox to test your browser AI agents. It provides a safe environment with intentional edge cases to verify that your agents can successfully submit reports.

## Local Setup and Self-Hosting

Filika can be set up for local development or deployed as a self-hosted production application.

- **Local Setup**: Learn how to configure your local database, set up Google/GitHub OAuth, and seed demo data in the [Local Setup Guide](docs/local-setup.md).
- **Self-Hosting**: Learn about production requirements, environment variables, and deployment in the [Self-Hosting Guide](docs/self-hosted.md).

## Security & Contributing

- **Security**: Filika is built with zero ambient capture. Read about our privacy guarantees and vulnerability reporting process in the [Security Guide](SECURITY.md).
- **Contributing**: We welcome contributions! Review our strict development rules, PR guidelines, and helpful commands in the [Contributing Guide](CONTRIBUTING.md).

## License

Distributed under the [Apache-2.0](LICENSE) License. Copyright &copy; 2026 Complaintr.
