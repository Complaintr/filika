# SDK Runtime Integration

The Phase 2 SDK core implements script bootstrap, configuration validation,
WebMCP registration, review gating, transport, receipts, retry, and disposal.
The native review dialog and manual button belong to the frontend track; they
are not bundled here. Without a review adapter, execution fails with
`internal_error` and does not transmit. No collector server is started by the SDK.

## Script and manual API

```html
<script src="/assets/filika.js"
  data-project-key="demo"
  data-endpoint="https://collector.example/api/v1/feedback"
  data-route-label="editor"
  data-application-release="demo-1"></script>
```

The classic script reads only its own four fixed attributes during evaluation.
An attribute-free script leaves the SDK uninitialized for `Filika.init(config)`.
Initialization resolves a bounded result; inspect `Filika.status` for readiness,
unsupported browsers, or registration diagnostics. `Filika.open({ signal }?)`
starts manual review, including without WebMCP. `Filika.dispose()` aborts owned
work, removes the tool through its registration signal, and clears retry state.
The frontend must remove its own dialog and listeners when the review signal
aborts. Duplicate script loads preserve the existing instance and in-flight work;
an unrelated existing `Filika` global is never overwritten.

## Frontend review boundary

Module integrations can import `createSdk` and supply a `ReviewAdapter` to the
factory. The script uses a synchronous, cancelable `filika:review` CustomEvent on
`document`, whose `detail` follows the exported `ReviewEventDetail` type.

The frontend must install its listener before execution. Call `preventDefault()`
synchronously to claim responsibility for showing the native review dialog.
Claiming the event does not approve transmission. Read `detail.request`, render
all fields for review, and call `detail.complete(decision)` exactly once after
the user's action. Never confirm automatically or on behalf of the user.

| Decision | Meaning |
| --- | --- |
| `{ kind: "confirmed", feedback, context }` | User explicitly confirmed the edited report and remaining context |
| `{ kind: "cancelled" }` | User canceled; no request |
| `{ kind: "retry" }` | User explicitly chose to resend the previous uncertain submission |

Decisions are closed objects. `feedback` is revalidated; context may only remove
optional host labels, not change values or the SDK version. The request contains
the draft (`null` for manual review), context, public project key, collector
origin, and an AbortSignal. If a previous submission is uncertain, `request.retry`
also contains a detached copy of its approved report, context, and event ID for
display. A retry sends the exact previously confirmed bytes and the same UUID;
editing and confirming creates a new UUID. No storage, automatic retry, or page
data collection is used. A newer confirmed submission replaces the retained one.

The UI must close review and remove event handlers when the request signal
aborts, including cancellation, the 120-second review deadline, and disposal.
The SDK also settles if an adapter ignores abort. A `complete` call after abort
has no effect. Frontend result presentation consumes the returned closed result;
receipt messages must be static local copy, never collector text.

## Collector boundary

The SDK sends one POST with `credentials: "omit"`, CORS, no referrer, no cache,
and `redirect: "error"`. It sends only the JSON content-type and the event UUID
as `Idempotency-Key`. The 10-second deadline includes response body reading.
Bodies are capped at 1,024 bytes and decoded as strict UTF-8. JSON content type is
required. A 201 response must have `duplicate: false`; a 200 response must have
`duplicate: true`. Both must match the exact [V1 receipt](sdk-contract.md).

The collector's documented pre-persistence statuses 400, 403, and 413 map to
`collector_rejected` without forwarding their body text. HTTP 500, unexpected
statuses, malformed receipts, stream errors, timeout, or abort after dispatch
produce `outcome_unknown`. The SDK does not adopt older collector helper fields
such as `receiptTimestamp`, `retentionHours`, or `source` in its receipt. Those
helpers must be adapted to the V1 wire receipt during collector integration.

The collector currently has a 65,536-byte early body-size helper while the V1
envelope limit is 32,768 bytes. The SDK enforces the stricter V1 limit. The
collector's schema counts UTF-16 units for some fields; the SDK follows the
frozen Unicode code-point contract. These collector alignment items remain
backend integration work; the SDK does not widen its contract to match them.
