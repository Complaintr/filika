# Filika

Filika is a clean-room project for collecting user-reviewed feedback from a
browser tool and presenting it in a read-only maintainer inbox.

The local demo connects the standalone SDK, native review dialog, and PostgreSQL
collector. Playwright verifies reviewed submission and persistence through the
real read APIs. The inbox UI still uses frontend preview data.

## Repository layout

- `apps/web`: deterministic demo application and maintainer inbox.
- `packages/sdk`: browser SDK and public protocol.
- `tests/e2e`: browser-level end-to-end tests.

## Documentation

- [Local development](docs/development.md)
- [Local demo setup and expected journey](docs/local-demo.md)
- [Local WebMCP testing](docs/webmcp-local-testing.md)
- [SDK V1 contract](docs/sdk-contract.md)
- [SDK runtime integration](docs/sdk-runtime.md)
- [SDK verification](docs/sdk-verification.md)
