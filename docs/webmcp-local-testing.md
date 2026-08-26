# Local WebMCP Testing

This procedure verifies the Filika test tool entirely on localhost. It does not
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

From the repository root, run:

```sh
bun install --frozen-lockfile
bun run dev:webmcp
```

Open <http://localhost:4173/> in the Chrome instance where both flags are
enabled. The page must display:

```text
Registered: filika_local_test
```

An unsupported configuration instead displays a bounded message and leaves the
host page usable.

## Inspect and invoke the tool

1. Open Chrome DevTools on the localhost page.
2. Select **Application**.
3. Select **WebMCP** at the top level of the Application sidebar.
4. Under **Available Tools**, select `filika_local_test`.
5. Confirm that the tool has no input properties and rejects additional
   properties.
6. In the manual test area, leave the input empty and click **Run tool**.
7. Confirm that **Invoked Tools** shows a completed call with this output:

```text
Filika localhost WebMCP test completed successfully.
```

The page's invocation count must increase by one. Chrome documents the
Available Tools list, invocation history, and manual **Run tool** flow in
[Debug WebMCP tools](https://developer.chrome.com/docs/devtools/application/webmcp).

## Troubleshooting

- If the page reports that WebMCP is unavailable, confirm both flags are
  enabled and relaunch Chrome again.
- If the **WebMCP** pane is missing, verify the Chrome version at
  `chrome://version` and confirm `#devtools-webmcp-support` is enabled.
- If registration fails, read the bounded error name shown on the page and
  inspect the DevTools Console for the original exception.
- If port 4173 is already occupied, stop the process using that port before
  starting the fixed local command again.
