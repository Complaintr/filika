# Local WebMCP Testing

This procedure inspects the integrated demo tools entirely on localhost. It does not
require deployment, a public tunnel, an origin-trial token, a hosted service, or
production credentials.

## Requirements

- Chrome 149 or newer.
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
