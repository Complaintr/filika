# Local feedback demo

The demo loads the real development SDK as a separate classic script, opens the
frontend's native review dialog, and submits only after confirmation to the real
PostgreSQL collector. No deployment, tunnel, AI service, or account is needed.

## Start from a clean checkout

Use Bun **1.3.14** and local PostgreSQL 16. The following optional Docker command
creates disposable demo data on a loopback-only port. Trust authentication is
for this local demo only; do not expose this database to a network.

```sh
bun install --frozen-lockfile
docker run --detach --rm --name filika-demo-db \
  --publish 127.0.0.1:55432:5432 \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=filika postgres:16
```

Wait for `docker exec filika-demo-db pg_isready -U postgres` to report ready.
In the collector terminal, run from the repository root:

```sh
export DATABASE_URL=postgres://postgres@localhost:55432/filika
bun run db:migrate
bun run db:seed
bun run dev:collector
```

In a second terminal at the repository root:

```sh
bun run dev
```

Open [the demo](http://localhost:4173/). The collector listens on port 8787.
Stop existing processes on 4173 or 8787 before starting. The seed allows exactly
`http://localhost:4173` and `http://127.0.0.1:4173`. Rebuild by restarting `bun run
dev` after source changes; this command does not provide hot reload.

## Public script contract

The source HTML contains this classic script before the app's module script:

```html
<script src="/sdk/filika.development.js"
  data-project-key="filika-demo"
  data-endpoint="http://localhost:8787/api/v1/feedback"
  data-route-label="Sample task"
  data-application-release="demo-2026.08"></script>
```

The demo build copies the SDK's exact development bundle bytes without merging
them into the application module. This preserves `document.currentScript` and
auto-initialization. The application never overwrites `window.Filika` or calls
the SDK factory. Only the development bundle permits loopback HTTP. The SDK's
separate `packages/sdk/dist/filika.js` production build still requires HTTPS.
`apps/web/dist` is a local demo build, not a production deployment artifact.

## Expected journey

1. Confirm the normal checklist task, or run **Run sample task** to see the
   deterministic save conflict. **Reset sample** restores the initial state.
2. In a WebMCP-enabled browser, invoke `filika_demo_save_draft` with `{}` and
   then `filika_submit_feedback` with the synthetic draft below. Use the
   [Chrome inspection guide](webmcp-local-testing.md) for the browser controls.
   Without WebMCP, click **Send feedback** or call `Filika.open()` and fill the
   same dialog manually.
3. Edit the report, remove optional context if desired, and click **Review
   submission**. Nothing has been sent yet. Inspect the destination, SDK
   version, remaining context, and retention notice before **Send feedback**.
4. The collector persists the reviewed envelope and the dialog shows only the
   feedback ID and received timestamp. Cancellation or review expiration sends
   nothing. An expired review requires editing/reviewing and confirmation again.
5. If delivery becomes uncertain, **Retry** resends the exact approved bytes and
   event UUID. A previously accepted event returns **Already received** with the
   original feedback ID and timestamp. There is no automatic retry. Retained
   retry state is in memory and disappears on reload/disposal.
6. Locate the accepted record through the real read API:

   ```sh
   curl --fail http://localhost:8787/api/v1/inbox
   curl --fail http://localhost:8787/api/v1/inbox/FEEDBACK_ID
   ```

Replace `FEEDBACK_ID` with the displayed receipt ID. The automated vertical slice
checks both APIs against real persistence and opens the accepted record in the
live inbox. Close the receipt dialog and click **View in inbox** in the receipt
notification to open that exact record. The **Inbox** navigation loads the live
list from the collector.

Synthetic tool input:

```json
{
  "kind": "bug",
  "title": "Sample draft cannot be saved",
  "description": "Running the sample save task displayed a save conflict.",
  "expectedBehavior": "The draft should save successfully.",
  "reproductionSteps": ["Run the sample task", "Observe the save conflict"]
}
```

Use synthetic data only. Reviewed feedback, SDK version, and any remaining static
host labels are submitted. The collector derives the request origin, receipt
identity/time, and unverified source. No page content, screenshots, browsing
history, or credentials are collected by the feedback flow. The existing
privacy link opens the demo's data-handling notice. The page uses local/system
font fallbacks without fetching external fonts. Reports are public and remain
stored and accessible until a maintainer runs cleanup after the 24-hour threshold.

Opening the inbox disposes both demo tools and the feedback SDK registration.
Returning to the demo reinitializes the SDK using the captured public script
configuration. Late inbox responses cannot render after demo tools reactivate.

## Browser verification

Create a separate database; browser tests refuse to use the demo database:

```sh
docker exec filika-demo-db createdb -U postgres filika_e2e
export E2E_DATABASE_URL=postgres://postgres@localhost:55432/filika_e2e
bunx --no-install playwright install chromium --only-shell
bun run test:browser:prepare
bun run test:browser
```

Stop the manual demo and collector first. Playwright starts both itself and
refuses to reuse an occupied server. `test:browser:prepare` **drops and recreates
the schemas** in the dedicated local `filika_e2e` database, then migrates and
seeds it. Run it before each repeated suite to clear test records and rate limits.
`E2E_DATABASE_URL` must name that database on a loopback host without query
parameters. It never falls back to `DATABASE_URL`.

Database-backed tests cover confirmed persistence, explicit duplicate retry after a
lost response, cancel/abort without transmission, manual fallback, and review
expiration. Only `document.modelContext` is replaced by a small test double;
the retry test additionally drops one real collector response after persistence.
Additional browser tests cover receipt-to-inbox navigation, tool isolation,
keyboard interaction, and hostile CSS. Registration tests cover bounded failures
and native `Permissions-Policy: tools=()` enforcement. The suites use the same
managed local servers. Native policy enforcement does not certify native tool
execution or agent selection; see [SDK verification](sdk-verification.md).

CI installs Chromium and system dependencies, migrates/seeds a fresh PostgreSQL
service database, runs the suite, and runs retention cleanup even after failure.
Failure traces are retained for seven days and contain synthetic test data.
See the Playwright documentation for [managed local servers](https://playwright.dev/docs/test-webserver)
and [CI setup](https://playwright.dev/docs/ci).

## Cleanup and other checks

In a terminal with the intended `DATABASE_URL`, `bun run db:cleanup` removes
expired feedback and rate-limit records; it does not erase fresh submissions.
Demo retention is 24 hours and cleanup is a command, not a background scheduler.
`bun run db:reset` destroys the configured database schemas; use only disposable
local data. Stop the temporary Docker container to discard all its data:

```sh
docker stop filika-demo-db
```

The collector unit/API tests also reset their configured test database. Create a
separate `filika_test` database and set `TEST_DATABASE_URL` before running them:

```sh
docker exec filika-demo-db createdb -U postgres filika_test
export TEST_DATABASE_URL=postgres://postgres@localhost:55432/filika_test
bun run check
bun run typecheck
bun run test:unit
bun run build
```

Run these checks before stopping the database container.

## Related guides

- [Local demo rehearsal](demo-rehearsal.md)
- [Demo recording checklist](demo-recording.md)
