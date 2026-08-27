# SDK Core Verification

## Automated checks

Use Bun 1.3.14:

```sh
bun install --frozen-lockfile
bun run check
bun run typecheck
bun run test:unit
bun run build
bun run test:browser
```

The unit suite covers script attribute capture, production/development URL
validation, closed input and Unicode bounds, WebMCP feature detection, exact
metadata registration, bounded failures and deadlines, duplicate initialization
and script loads, disposal races, minimal context, UUID/header identity, review
confirmation, abort before and after dispatch, strict response decoding, receipt
reconstruction, explicit retry, and deterministic minified build output.

The five V1 contract snapshots remain unchanged. Tests and build scripts are
included in strict TypeScript checks. The browser CI command still contains its
existing TODO; it does not perform the manual smoke procedure below. No test
claims a working collector or production review dialog.

The final local run on 2026-08-27 passed 207 unit tests and all five snapshots,
locked installation, formatting/lint, strict typechecking, production and
development builds, and `git diff --check`. The browser command reported its one
existing TODO. esbuild was run with approved execution outside the local sandbox
because its subprocess does not complete inside that sandbox.

## Manual browser smoke procedure

Run `bun run dev:sdk-smoke`, then open `http://localhost:4187/`. This fixture
loads the production IIFE through the public script-attribute contract. Its
review dialog and fetch implementation are test adapters, not product UI or a
collector. Only synthetic data is used; no feedback leaves the page.

1. Confirm `ready`, one registered tool, and zero requests.
2. Open manual review. Confirm no request has been sent. Cancel; expect
   `cancelled` and still zero requests.
3. Enable **Simulate lost response**, open manual review, edit the title, and
   confirm. Expect one request and `outcome_unknown`.
4. Open review again and explicitly choose **Retry same report**. Expect two
   requests in total, the same event UUID and report, and `success` with a
   `duplicate: true` receipt containing the original identity and timestamp.
5. Choose **Reload SDK**. Expect the same global instance, one registered tool,
   unchanged result, and no extra request.
6. Choose **Dispose SDK**. Expect `disposed` and zero registered tools.

This procedure passed in the in-app browser on 2026-08-27. Registration and
signal-owned removal used the browser's WebMCP surface; review, transport,
idempotent storage, and receipts used the explicit synthetic adapters above.

### Native execution limitation

The browser used for this run supplied only `requestUserInteraction` in its
tool callback options, instead of the current specification's required
`signal`. Native execution therefore returned `invalid_input` without sending a
request. The SDK deliberately does not invent a cancellation signal or adopt
the older callback contract. Current `document.modelContext` execution,
registration rejection, and abort behavior are covered with typed test doubles;
full native tool execution must be repeated in a browser implementing the
current callback-options contract. The fixture's **Invoke tool** button provides
that verification path. This is a recorded limitation, not a passed native
execution test.

## Remaining integration work

Connect the frontend-owned native dialog and manual button to the review
adapter. Adapt collector receipt helpers and request limits to the frozen V1
wire contract as described in [runtime integration](sdk-runtime.md). Verify the
real collector, inbox, CORS, and user journey in the later integration phase.
No deployment, external service, or automatic retry was introduced.
