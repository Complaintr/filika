# SDK verification

See [verification results](verification-results.md) for the dated clean-checkout
baseline and the distinction between automated and native-browser evidence.

Additional verification procedures:

- [Chrome DevTools](webmcp-local-testing.md) and [independent Inspector](webmcp-inspector-testing.md).
- [Agent evaluation protocol](webmcp-evals.md) and [unmeasured/observed results](webmcp-eval-results.md).
- [Prepared ChatGPT Site Tools script](site-tools-test-script.md) for a later approved deployment.

## Automated checks

Use Bun 1.3.14. Configure dedicated local PostgreSQL databases for unit/API and
browser tests as described in the [local demo guide](local-demo.md). Then run:

```sh
bun install --frozen-lockfile
bun run check
bun run typecheck
bun run test:unit
bun run build
bun run test:browser:prepare
bun run test:browser
```

Browser preparation resets the selected `filika_e2e` database. Never use a
database containing real data. `TEST_DATABASE_URL` should point to a separate
`filika_test` database so API tests cannot interfere with browser tests.

The SDK unit suite checks exact V1 contract snapshots, script initialization,
configuration validation, registration, abort/disposal races, review gating,
bounded transport, receipt reconstruction, and explicit retry. Build tests
verify both bundle modes, static metadata, allowed inputs, and deterministic
checksums and SRI. Generated build files are not committed.

Playwright exercises the real SDK, native dialog, collector, and inbox. It
covers editing, context removal, confirmation, cancellation, unknown-outcome
retry, manual feedback, keyboard navigation, hostile CSS, and inbox isolation.
Most tool invocations use a small `document.modelContext` test double.

## Native registration and permissions policy

`tests/e2e/specs/registration-policy.spec.ts` tests all five bounded registration
diagnostics with explicit doubles. Its separate native test enables Chromium's
`WebMCPTesting` feature, requires successful registration without a policy, then
serves the same page with `Permissions-Policy: tools=()` and requires rejection.
No model-context double is installed in that native case. A browser without the
native API is reported as a skip, not a passing policy test.

The [WebMCP draft](https://webmachinelearning.github.io/webmcp/) specifies
`NotAllowedError` for policy denial. Older Chromium implementations used
`SecurityError`, as recorded in the
[upstream policy issue](https://github.com/webmachinelearning/webmcp/issues/178).
The SDK maps both to bounded diagnostics and preserves manual review.

Native registration tests do not verify native execution or agent tool
selection. The SDK requires `signal` in execution options; browsers that supply
only older callback options return `invalid_input` without sending feedback.
Use the [Chrome testing guide](webmcp-local-testing.md) to verify the complete
flow in a compatible browser. Automated accessibility checks do not replace
manual screen-reader testing.

## Isolated SDK smoke fixture

Run `bun run dev:sdk-smoke` and open `http://localhost:4187/`. The fixture loads
the production IIFE through its public script attributes, with a synthetic
review dialog and an in-memory fetch stub. No feedback leaves the page.

1. Confirm `ready`, one registered tool, and zero requests.
2. Open manual review and cancel. Expect `cancelled` and zero requests.
3. Enable **Simulate lost response**, open review, edit, and confirm. Expect one
   request and `outcome_unknown`.
4. Open review and choose **Retry same report**. Expect the same event UUID and
   report, plus a duplicate receipt with the original identity and timestamp.
5. Choose **Reload SDK**. Expect the same instance and no extra registration.
6. Choose **Dispose SDK**. Expect `disposed` and zero registered tools.

The fixture uses native WebMCP when available and a test double otherwise.
Inspect which path is active before interpreting the result. Use the integrated
local demo for actual collector persistence and inbox verification.
