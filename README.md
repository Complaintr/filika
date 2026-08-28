# Filika

Filika collects user-reviewed feedback from a
browser tool and presenting it in a read-only maintainer inbox.

The local demo connects the standalone SDK, native review dialog, and PostgreSQL
collector. Playwright verifies reviewed submission and persistence through the
real read APIs and opens the matching record in the live inbox UI.

## Repository layout

- `apps/web`: deterministic demo application and maintainer inbox.
- `packages/sdk`: browser SDK and public protocol.
- `packages/collector`: feedback API and PostgreSQL persistence.
- `tests/e2e`: browser-level end-to-end tests.

## Documentation

- [Local development](docs/development.md)
- [Local demo setup and expected journey](docs/local-demo.md)
- [Local WebMCP testing](docs/webmcp-local-testing.md)
- [SDK V1 contract](docs/sdk-contract.md)
- [SDK runtime integration](docs/sdk-runtime.md)
- [SDK verification](docs/sdk-verification.md)
- [Security and data handling](docs/security.md)
