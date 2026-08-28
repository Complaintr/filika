# End-to-End Tests

Playwright runs the local application on port 4173 and the real collector on
port 8787 against an explicitly configured local `filika_e2e` PostgreSQL database.
The five database-backed scenarios cover edited/confirmed persistence through the inbox read
APIs, lost-response duplicate retry, cancel/abort, manual fallback, and review
expiration. Four frontend scenarios additionally cover live inbox navigation,
manual/cancel flows, duplicate retry, and hostile CSS with intercepted responses.
The native dialog and SDK bundle are real; `document.modelContext`
is a small test double, not certification of native Chrome WebMCP support.

Follow the [local demo guide](../../docs/local-demo.md#browser-verification) to
install Chromium, set `E2E_DATABASE_URL`, and run:

```sh
bun run test:browser:prepare
bun run test:browser
```

Preparation destroys schemas only in the explicitly selected local `filika_e2e`
database, then migrates and seeds it. Existing demo/collector servers must be
stopped; the test runner does not reuse them. Browser failure traces are written
under `tests/e2e/test-results/` and ignored by Git and Biome.

## SDK core smoke fixture

Run `bun run dev:sdk-smoke` from the repository root and open
`http://localhost:4187/`. The fixture uses the real minified production bundle,
a synthetic review UI, and an in-memory fetch stub. No feedback leaves the page.
It uses the browser's WebMCP API when available and a test double otherwise.
See [SDK verification](../../docs/sdk-verification.md) for steps and limitations.
