# Release candidate verification

## Clean checkout result

Verified on 2026-08-28 at source revision
`b9caabca478d75e4bc093bb340534152f5c13bbb`. The test directory was a local
`git clone --no-local` of this repository, fast-forwarded only to the committed
checkout-directory test fix. No working-tree files, untracked assets, or installed
dependencies were copied into it. Its tracked and untracked status was clean
after the run; generated build output is ignored.

Environment: Linux x64, Bun 1.3.14, PostgreSQL 16.15, Playwright 1.62.1, and its
Chromium headless shell build 1234. Playwright reported an unsupported host OS
and used its Ubuntu 24.04 x64 fallback build. This is one tested environment,
not a claim of native support on every OS.

A disposable PostgreSQL container exposed only loopback port 55440. Demo migration
and seed used `filika`; unit/API tests used `filika_test`; browser tests used
`filika_e2e`. No database contained user data.

| Check | Result |
| --- | --- |
| Frozen install | Passed; 84 packages on initial install, unchanged lock on repeat |
| Formatting/lint | `bun run check` and `bun run lint` passed; 206 files |
| Typecheck | All four workspaces passed |
| Demo migration and seed | Passed against an empty database |
| Unit/API | 429 passed, 0 failed, 0 skipped; 5 contract snapshots |
| Separate collector API command | 41 passed; included in the unit total, not additional coverage |
| Database-command helper tests | 3 passed, including arbitrary names and spaces |
| Build | SDK, web, and browser fixture builds passed |
| Chromium installation | Passed with the host-OS fallback warning above |
| Browser reset/migration/seed | Passed in the dedicated test database |
| End-to-end browser suite | 36 passed, 0 skipped, including native permissions-policy enforcement |
| Demo and browser cleanup | Both commands passed |

The initial attempt exposed a pre-existing test assumption that the checkout
directory was named `filika`. It failed in the differently named clone. The test
was corrected using explicit path fixtures rather than renaming the clone to
hide the failure. The full sequence above then passed. Cleanup of the initially
unmigrated browser database also failed in the interrupted attempt; both cleanup
commands passed after the complete rerun. Failed attempts are not release evidence.

## Reproduction sequence

Start from a fresh clone at the source revision being verified. Use Bun 1.3.14,
install PostgreSQL as described in [the local guide](local-demo.md), and create
three disposable databases. Set `DATABASE_URL` for `filika`, `TEST_DATABASE_URL`
for `filika_test`, and `E2E_DATABASE_URL` for local `filika_e2e`. Stop any manual
servers using ports 4173 or 8787. Run sequentially:

```sh
bun install --frozen-lockfile
bun run check
bun run lint
bun run typecheck
bun run db:migrate
bun run db:seed
bun run test:unit
bun test packages/collector/test/integration.test.ts
bun test tests/e2e/database.test.ts
bun run build
bunx --no-install playwright install chromium --only-shell
bun run test:browser:prepare
bun run test:browser
bun run db:cleanup
bun run tests/e2e/database.ts cleanup
git status --short
```

Unit/API tests and browser preparation destroy their selected test schemas.
Never use real data. Require database tests and the native policy test to run;
record skips rather than treating a green exit as complete verification. Run
cleanup even after failure, reporting its own result without overwriting the
original failure. Stop the disposable database container after all checks.

## Scope of acceptance

These checks validate automated behavior and reproducible local builds. Native
DevTools/Inspector execution, human screen-reader verification, real agent evals,
and later Site Tools acceptance are not established by this run. The documented
SDK/collector Unicode-limit mismatch and dependency redistribution notice checks
also remain open. See [challenge limitations](challenge.md),
[the evaluation ledger](webmcp-eval-results.md), and
[the dependency review](provenance-review.md).

A candidate manifest must identify the exact tested source revision and artifact
bytes, not infer approval from these results. No tag, package publication,
deployment, or production-readiness approval is created by this verification.
