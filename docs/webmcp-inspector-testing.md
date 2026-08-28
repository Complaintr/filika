# WebMCP Inspector verification

This is an independent native-browser check, not a replacement for
[DevTools verification](webmcp-local-testing.md). Use the integrated localhost
demo and its real collector. Do not use the SDK smoke fixture, a polyfill, or a
model-context test double.

## Prerequisites

Use **WebMCP - Model Context Tool Inspector**, linked by
[GoogleChromeLabs](https://github.com/GoogleChromeLabs/webmcp-tools), rather than
an unrelated similarly named extension. Its
[upstream guide](https://github.com/beaufortfrancois/model-context-tool-inspector)
requires Chrome 150.0.7861.0 or newer and the WebMCP testing flag. The
[store listing](https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd)
warns against using it on untrusted sites. These requirements were checked on
2026-08-28; record the actual installed version when testing.

Installation and browser-setting changes require the browser owner's approval.
Use a dedicated testing profile with synthetic data only. Keep AI/Gemini features
off: manual execution requires no provider, API key, or account configuration.
Do not add the extension's dependencies or source to this repository.

Start the [local demo](local-demo.md). Open the extension from Chrome's toolbar
on `http://localhost:4173/`, and use its side panel. Record date, source revision,
SDK hash, browser version/channel, enabled flags, and Inspector version. A missing
extension, inaccessible panel, unsupported API, or unavailable execution control
is **not run** with its reason, never a pass.

## Separate acceptance sequence

1. Reload the demo. In the Inspector's tool list verify exactly one
   `filika_submit_feedback` and one `filika_demo_save_draft`. Check the feedback
   name, title, description, schema, and annotations against the SDK exports.
2. Select `filika_demo_save_draft`, enter `{}` in **Input Arguments**, and choose
   **Execute Tool**. Require the visible save conflict and no feedback POST.
3. Select `filika_submit_feedback`, paste the synthetic draft from
   [the local journey](local-demo.md#expected-journey), and execute. Require the
   real editable dialog and zero POSTs before confirmation. Cancel in the dialog.
   Require the tool outcome `cancelled` and no new stored feedback.
4. Execute the same draft again. Edit the title to `Inspector review check`,
   remove the optional route label, and review the destination. Confirm once.
   Require one POST, `success`, and a validated receipt. Open that exact receipt
   in the inbox and check the edited title and absence of the removed label.
5. With Inbox open, inspect the available tools again. Both demo tools must be
   absent. Returning to Demo must restore exactly one of each. This tests the
   application's real disposal/reinitialization path.
6. Execute another draft but leave review pending. Navigate to Inbox if the UI
   permits it; otherwise use the DevTools Console to call the documented public
   `Filika.dispose()` API. This explicit manual operator step must be authorized
   before entering code. Require `aborted`, a closed review dialog, zero POSTs,
   and removal of the feedback tool. Reload before the next test. If active-call
   disposal cannot be exercised, record that row as not run separately from idle
   disposal; do not infer it from step 5.

Dialog cancellation in step 3 is different from aborting execution. If the
installed Inspector additionally exposes an execution-abort control, exercise
it while review is pending: require `aborted` and zero POSTs. Record the control
and observed result, or mark Inspector-originated abort unsupported. Do not
invent an Inspector control or silently substitute dialog cancellation for it.

Use filtered Network observations or collector/inbox assertions to count only
feedback POSTs. Keep raw headers, browsing data, and full session exports out of
the evidence. Record bounded outcomes and synthetic receipt identity only.
Tool completion is insufficient: inspect `code` inside the result. Incompatible
execution options returning `invalid_input` are a failed invocation, not success.

## Evidence status

No Inspector acceptance run has been recorded. Browser internal settings are
inaccessible to the current automation surface; the installed extension version
and side panel have not been verified. No extension was installed or provider
enabled. Registration, invocation, cancellation, active disposal, and tool-list
removal remain open checks. Record these independently in
[verification results](verification-results.md) after actual execution.
