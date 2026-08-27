# End-to-End Tests

This directory is reserved for browser-level tests of the localhost flow from
the demo application through feedback review and the maintainer inbox.

Test-runner setup and scenarios belong to later project tasks.

## SDK core smoke fixture

Run `bun run dev:sdk-smoke` from the repository root and open
`http://localhost:4187/`. The fixture uses the real minified production bundle,
a synthetic review UI, and an in-memory fetch stub. No feedback leaves the page.
It uses the browser's WebMCP API when available and a test double otherwise.
See [SDK verification](../../docs/sdk-verification.md) for steps and limitations.
