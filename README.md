# Filika

Filika is a clean-room project for collecting user-reviewed feedback from a
browser tool and presenting it in a read-only maintainer inbox.

The repository contains the project foundation, frontend contracts for the
feedback dialog and maintainer inbox, and the Phase 2 SDK core. The native review
UI and collector server still require their component implementation and integration.

## Repository layout

- `apps/web`: deterministic demo application and maintainer inbox.
- `packages/sdk`: browser SDK and public protocol.
- `tests/e2e`: browser-level end-to-end tests.

## Documentation

- [Local development](docs/development.md)
- [Local WebMCP testing](docs/webmcp-local-testing.md)
- [SDK V1 contract](docs/sdk-contract.md)
- [SDK runtime integration](docs/sdk-runtime.md)
- [SDK verification](docs/sdk-verification.md)
