# Local WebMCP Testing

This procedure inspects the integrated demo tools entirely on localhost. It does not
require deployment, a public tunnel, an origin-trial token, a hosted service, or
production credentials.

## Requirements

- Chrome with the current `document.modelContext` implementation. The DevTools
  pane was introduced in Chrome 149; the current Inspector requires
  Chrome 150.0.7861.0 or newer (see the [separate Inspector procedure](webmcp-inspector-testing.md)).
- Bun 1.3.14.

Chrome currently exposes WebMCP and its DevTools pane behind two experimental
flags. Open each URL in Chrome and set the flag to **Enabled**:

1. `chrome://flags/#enable-webmcp-testing`
2. `chrome://flags/#devtools-webmcp-support`

Click **Relaunch** after changing the flags. These names and the Chrome 149
DevTools support are documented in the
[Chrome 149 DevTools release notes](https://developer.chrome.com/blog/new-in-devtools-149#webmcp).

## Start the local page

First migrate/seed PostgreSQL and start the collector using the
[local demo guide](local-demo.md). In a second terminal at the repository root, run:

```sh
bun install --frozen-lockfile
bun run dev:webmcp
```

Open <http://localhost:4173/> in the Chrome instance where both flags are
enabled. The page must display:

```text
WebMCP demo task ready.
```

An unsupported configuration instead displays a bounded message and leaves the
host page usable.

## Inspect and invoke the tool

1. Open Chrome DevTools on the localhost page.
2. Select **Application**.
3. Select **WebMCP** at the top level of the Application sidebar.
4. Under **Available Tools**, select `filika_demo_save_draft`.
5. Confirm that its input schema is closed and run it with `{}`. The demo shows
   the visible save conflict; **Reset sample** restores the initial state.
6. Select `filika_submit_feedback` and supply the synthetic draft in the
   [local demo guide](local-demo.md#expected-journey).
7. Edit or remove fields in the native review dialog, review the destination,
   and explicitly confirm. The call completes with a closed outcome and, on
   success, the validated receipt. Check that record through the real inbox API.

The page status describes the demo task. Inspect `Filika.status` separately for
feedback-tool readiness or its bounded registration diagnostic. Chrome documents
Available Tools, invocation history, and manual **Run tool** controls in
[Debug WebMCP tools](https://developer.chrome.com/docs/devtools/application/webmcp).
The automated Playwright suite uses a test double; this native-browser inspection
remains a separate manual check.

## Native acceptance record

Use the integrated demo, not the smoke fixture, which may install a double.
Record the source revision, date, Chrome version/channel, both flag states,
SDK build SHA-256, and whether any polyfill or test double is present. Stop if
the page is not using the native `document.modelContext` API. A ready demo-task
status alone does not certify feedback registration or invocation.

Run each row from a fresh page with only synthetic data. In Network, filter on
`/api/v1/feedback`; count POST requests, not preflight or inbox GET requests.
Do not export headers or a full HAR. Record only bounded outcomes, request counts,
and synthetic receipt identity. Keep the feedback dialog visible while the
DevTools call is pending.

| Check | Action | Required observation |
| --- | --- | --- |
| Registration | Open Application → WebMCP | Exactly one feedback tool and one demo task; feedback metadata matches `packages/sdk/src/tool.ts` and its schema |
| Failure | Run `filika_demo_save_draft` with `{}` | Visible save conflict; zero feedback POSTs |
| Invocation and review | Run the synthetic feedback draft above | Editable review opens; call remains pending; zero POSTs |
| Confirmation | Edit the title, remove route context, review, then send | One POST with reviewed fields; `success` with a validated receipt; exact record appears in inbox |
| Cancellation | Reload, invoke again, choose Cancel in the dialog | `cancelled`; zero POSTs for this invocation; no receipt |
| Disposal | Close the dialog and open Inbox | Both tools disappear from Available Tools; returning to Demo registers each once |

Compare the raw tool outcome with the SDK's closed outcome contract. A DevTools
execution marked Completed can still contain `invalid_input` or another failure.
For the success row, require `code: "success"`, not only that the browser finished
the call. If a valid draft immediately returns `invalid_input`, record a native
execution compatibility failure; do not inject a replacement execution signal,
install a polyfill, or switch to manual feedback and call it a native pass.

If browser settings or the DevTools surface are inaccessible, record **not run**
and request a human verification of the rows. Do not bypass browser restrictions.
Use the [results document](verification-results.md) to distinguish completed
observations from outstanding checks.

## Troubleshooting

- If the page reports that WebMCP is unavailable, confirm both flags are
  enabled and relaunch Chrome again.
- If the **WebMCP** pane is missing, verify the Chrome version at
  `chrome://version` and confirm `#devtools-webmcp-support` is enabled.
- If registration fails, read the bounded error name shown on the page and
  inspect `Filika.status` for the SDK diagnostic. Raw registration errors are
  intentionally not forwarded by the SDK.
- If port 4173 is already occupied, stop the process using that port before
  starting the fixed local command again.
