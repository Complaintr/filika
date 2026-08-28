# Security and data handling

## User review and trust boundaries

Filika treats tool input, host configuration, and collector responses as
untrusted. The SDK validates closed schemas, rejects unknown fields, and bounds
input and response sizes. It does not read page content, cookies, browsing
history, screenshots, or credentials automatically. Users can still paste
sensitive information into report fields; the demo must use synthetic data only.

Agent-authored feedback is not transmitted until the user reviews and explicitly
confirms it. Optional host labels can be removed. The request omits credentials
and referrer information, refuses redirects, and uses a bounded timeout. An
abort after dispatch can produce `outcome_unknown` because cancellation cannot
undo a server write. Explicit retry preserves the approved bytes and event ID.

Tool metadata is static and frozen. Agent-facing responses contain only closed
outcome codes and validated receipt primitives; report content and raw collector
messages are not echoed. Inbox values render as text. Navigating to the inbox
removes both tools, and stale inbox responses cannot replace the demo after its
tools are reactivated.

## Demo access and retention

The demo inbox is public and read-only. Project keys are routing identifiers,
not secrets. Origin allowlists and CORS do not authenticate non-browser clients;
submissions retain the `web_sdk_unverified` source label.

Feedback becomes eligible for deletion after 24 hours. A maintainer must run
`bun run db:cleanup`; there is no automatic cleanup scheduler. Expired records
remain stored and accessible until cleanup runs. The same command removes
expired rate-limit records. Operational log retention belongs to the operator;
the collector does not configure a log-retention service.

The local page uses local/system font fallbacks and does not load remote fonts.
See the [local demo guide](local-demo.md) for setup and cleanup commands.

## Browser compatibility and integrity

The SDK targets `document.modelContext` and requires an execution `AbortSignal`.
Browsers exposing older callback options may register the tool but cannot
execute it through this contract. Unsupported browsers and registration failures
retain the manual feedback path.

`Permissions-Policy: tools=()` can prevent native registration in supporting
browsers. The native browser test checks successful registration without the
header before verifying denial with it. Integration tests otherwise use an
explicit model-context double; they do not certify agent tool selection or
screen-reader behavior. See [SDK verification](sdk-verification.md).

Production bundles require HTTPS collector endpoints. Build metadata contains
SHA-256 checksums and SHA-384 SRI calculated from the exact emitted bytes. The
SDK has no runtime package dependencies; see the [SDK build guide](../packages/sdk/README.md).
