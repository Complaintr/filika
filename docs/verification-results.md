# Verification results

## Clean checkout baseline

Verified on 2026-08-28 from source revision
`e94680f9763614fddaf7810ae73eb8b941dd9289` in a fresh local clone made with
`git clone --no-local`. No untracked assets, installed dependencies, or build
outputs were copied from the working checkout. These results describe that
revision, not later changes or a deployed release.

Environment: Linux x64, Bun 1.3.14, PostgreSQL 16, Playwright 1.62.1 and its
Chromium headless shell (build 1234). A disposable PostgreSQL container exposed
only loopback port 55439. Unit/API tests used `filika_test`; browser tests used
`filika_e2e`. Neither database contained user data.

| Command | Observed result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed; 84 packages installed |
| `bun run check` | Passed; 192 files checked |
| `bun run typecheck` | Passed in all four workspaces |
| `bun run lint` | Passed; 192 files checked |
| `bun run test:unit` | 405 passed, 0 failed, 0 skipped; 5 snapshots |
| `bun test packages/collector/test/integration.test.ts` | 31 passed, 0 failed, 0 skipped; also included in the unit total |
| `bun run build` | Passed for SDK, web application, and browser fixtures |
| `bun run test:browser:prepare` | Passed; reset, migrations, and seed applied |
| `bun run test:browser` | 22 passed, 0 skipped |
| `bun run tests/e2e/database.ts cleanup` | Passed; no expired rows in the fresh test database |

The first restricted-environment attempt could not reach PostgreSQL and the
build subprocess timed out. Those failed/skipped results are not the accepted
baseline. The complete unit/API and build commands were rerun successfully with
local database and subprocess access; browser preparation and execution used
the same access. The clone remained clean after verification.

To reproduce, follow [local setup](local-demo.md), select dedicated disposable
databases using `TEST_DATABASE_URL` and `E2E_DATABASE_URL`, and run the commands
above in order. Do not run build and build-writing tests concurrently. Database
preparation and API tests destroy their selected test schemas.

## What the baseline establishes

The browser suite exercises the real SDK bundle, review dialog, collector,
PostgreSQL persistence, and inbox. Its native permissions-policy case also
passed, without a model-context double. Other tool invocations use a double.
Passing these tests does **not** establish native Chrome tool execution,
DevTools or Inspector operation, or agent tool-selection quality. Those require
separate observed evidence. No deployment, tunnel, provider, or external account
was configured for this verification.

Production SDK artifact: 20,295 bytes; SHA-256
`a71105bc411c7953acfbc235310a88a6c49bce64dbe696d090f654d5194b0754`.
The build's generated metadata includes SHA-384 SRI; generated assets remain
untracked.

## Native Chrome DevTools

The integrated localhost page was opened in connected Chrome without installing
a test double and displayed `WebMCP demo task ready.` This is a demo-registration
observation only. Chrome version/flag verification could not be completed because
the browser-control policy blocks internal Chrome URLs. No settings were changed.

The [native acceptance matrix](webmcp-local-testing.md#native-acceptance-record)
is **not run**: exact feedback metadata inspection, DevTools invocation,
confirmation, cancellation, and disposal still require a human-accessible
DevTools session. Native headless permissions-policy results above do not replace
this matrix. There is no claim of native full-journey success.

## Independent Inspector path

The [Inspector acceptance sequence](webmcp-inspector-testing.md) is **not run**.
The installed Inspector/version and its browser side panel have not been
verified. Registration, invocation, cancellation, and active disposal therefore
have no Inspector evidence. No extension, provider, or API credentials were added.

## Agent evaluation

The [evaluation ledger](webmcp-eval-results.md) records all nine scenarios as not
run and all four agent-quality metrics as not measured. Fixture/schema validation
and automated runtime checks are reported separately. Native execution and agent
selection remain verification gaps, not release-readiness claims.
