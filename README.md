# Filika

Filika turns an agent's observed problem into feedback the user can review before
it reaches a maintainer. A browser agent drafts a bug, blocked task, confusing
behavior, or concrete idea through WebMCP. The user edits and confirms it; a
collector stores the approved report and returns a receipt linked to a read-only
inbox. Drafting is never proof of submission.

The repository includes a standalone browser SDK, a native review dialog, a
deterministic demo, and a PostgreSQL collector. It is a local demonstration, not
a published SDK package or a hosted service. Native Chrome execution and real
agent-selection evaluations still need separate evidence; passing automated
tests does not establish those results.

## Local quickstart

Use **Bun 1.3.14** and **PostgreSQL 16**. In a fresh checkout:

```sh
bun install --frozen-lockfile
docker run --detach --rm --name filika-demo-db \
  --publish 127.0.0.1:55432:5432 \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=filika postgres:16
docker exec filika-demo-db pg_isready -U postgres
```

Wait for PostgreSQL to report ready. The container is disposable and uses trust
authentication only on loopback; never expose it or use real data. In one terminal:

```sh
export DATABASE_URL=postgres://postgres@localhost:55432/filika
bun run db:migrate
bun run db:seed
bun run dev:collector
```

In another terminal at the repository root, run `bun run dev`. Open
[the local demo](http://localhost:4173/). Ports 4173 and 8787 must be free.
Restart the web command after source changes; it does not hot reload.
See [the complete local guide](docs/local-demo.md) for setup and cleanup details.

## Two-line SDK integration

For a local host that already installs the review adapter and serves the built
development SDK, bootstrap through its public script attributes:

```html
<script src="/sdk/filika.development.js" data-project-key="filika-demo"
  data-endpoint="http://localhost:8787/api/v1/feedback"></script>
```

The demo builds and serves this asset automatically. On another application,
provide a collector and a `filika:review` listener **before tool execution**;
the SDK does not bundle the dialog. Without a review adapter it fails safely
without sending. `Filika.open()` opens the same manual review path even when
WebMCP is unavailable. `Filika.dispose()` aborts work and removes registration.

For production integration, use the separately built `packages/sdk/dist/filika.js`
and an HTTPS collector, not the development bundle. Use the generated metadata's
checksum/SRI for the exact artifact; no CDN URL or published version is supplied.
See [SDK runtime integration](docs/sdk-runtime.md) for review decisions, static
context, lifecycle, retry, and configuration requirements.

## Demo journey

1. Complete **Confirm checklist**, or run the sample task to see its resettable
   save failure. In compatible Chrome, the demo tool can trigger the same failure.
2. Let an agent draft feedback through `filika_submit_feedback`, or use
   **Send feedback** manually. No feedback is sent yet.
3. Edit required fields, clear optional fields, remove optional context, and
   choose **Review submission**. Inspect the destination and public-data notice.
4. Explicitly choose **Send feedback**, or cancel without transmission. Successful
   delivery returns a receipt; **View in inbox** opens that exact report.
5. After an uncertain delivery, explicit **Retry** reuses the approved bytes and
   event ID. A duplicate returns the original receipt, not a second stored report.

Reports are public: use synthetic data only. The SDK does not automatically
collect page content, credentials, screenshots, or browsing history. Feedback is
eligible for deletion after 24 hours but remains accessible until an operator
runs `bun run db:cleanup`. Opening Inbox removes the page's WebMCP tools.

## Verification

While the disposable database is running, create separate test databases:

```sh
docker exec filika-demo-db createdb -U postgres filika_test
docker exec filika-demo-db createdb -U postgres filika_e2e
export TEST_DATABASE_URL=postgres://postgres@localhost:55432/filika_test
export E2E_DATABASE_URL=postgres://postgres@localhost:55432/filika_e2e
bun install --frozen-lockfile
bun run check
bun run typecheck
bun run test:unit
bun run build
bunx --no-install playwright install chromium --only-shell
bun run test:browser:prepare
bun run test:browser
bun run tests/e2e/database.ts cleanup
```

Stop the manual web/collector processes before the browser commands; Playwright
starts its own. Run these commands sequentially. API tests and browser preparation
**destroy their selected test schemas**; never point them at user data. Database
tests must actually run, not silently skip. The unit command includes collector
API tests; `bun test packages/collector/test/integration.test.ts` runs them alone.
Headless browser installation may also require system libraries on a fresh OS.

Most tool invocations use a `document.modelContext` double. The native
permissions-policy test is separate; record any unsupported-browser skip.
[Chrome DevTools](docs/webmcp-local-testing.md),
[Inspector](docs/webmcp-inspector-testing.md), and
[agent evals](docs/webmcp-evals.md) remain distinct verification paths.
After testing, `docker stop filika-demo-db` discards the disposable container data.

## Repository layout

- `apps/web`: deterministic demo application and maintainer inbox.
- `packages/sdk`: browser SDK and public protocol.
- `packages/collector`: feedback API and PostgreSQL persistence.
- `tests/e2e`: browser-level end-to-end tests.

## Documentation

- [WebMCP fit, evaluation method, and known limitations](docs/challenge.md)
- [Local development](docs/development.md)
- [Local demo setup and expected journey](docs/local-demo.md)
- [Local WebMCP testing](docs/webmcp-local-testing.md)
- [SDK V1 contract](docs/sdk-contract.md)
- [SDK runtime integration](docs/sdk-runtime.md)
- [SDK verification](docs/sdk-verification.md)
- [Security and data handling](docs/security.md)
- [Evaluation results and outstanding checks](docs/webmcp-eval-results.md)
