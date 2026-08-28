# Filika: reviewed feedback through WebMCP

## Product fit

An agent that encounters a problem often has useful task evidence but should not
silently submit a report on the user's behalf. Filika gives it a narrow tool for
drafting that report. The user can correct every authored field, remove optional
host context, and confirm the destination before transmission. Maintainers get
the approved report, a server-issued receipt, and a read-only inbox.

WebMCP exposes page functionality as structured tools. The current
[community draft](https://webmachinelearning.github.io/webmcp/) is experimental,
not a W3C Standard. Filika uses `document.modelContext`, static metadata, closed
input schemas, and registration/execution abort signals. Its review and receipt
logic remains application-owned; tool discovery does not grant permission to send.

## Demonstration

Follow the [README quickstart](../README.md#local-quickstart). The normal checklist
completes successfully; the separate sample save produces a deterministic,
resettable conflict. `filika_demo_save_draft` exposes that same task to an agent.
`filika_submit_feedback` opens review with a draft about the observed problem.
The manual button uses the same review and collector flow without WebMCP.

The user edits, reviews, and confirms. The SDK validates the approved envelope
and posts it once to the collector. The returned receipt links to the exact
persisted report. Cancel before dispatch sends nothing; uncertain delivery keeps
the approved event available for an explicit, idempotent retry. Inbox navigation
removes both tools. See [the journey](local-demo.md#expected-journey) and
[recording rehearsal](demo-rehearsal.md) for the manual steps.

## Chrome verification

Use the [native Chrome procedure](webmcp-local-testing.md), including its version
and flag checks. The
[DevTools WebMCP pane](https://developer.chrome.com/docs/devtools/application/webmcp)
shows available tools and invocation input/output under Application. Compare the
feedback metadata to the SDK exports, invoke the sample task, then exercise review,
confirmation, cancellation, and tool removal. A browser call marked completed is
not enough: inspect the SDK's outcome code and verify a successful receipt in the
inbox.

Run the [Inspector procedure](webmcp-inspector-testing.md) independently. The
[Inspector's upstream requirements](https://github.com/beaufortfrancois/model-context-tool-inspector)
currently specify Chrome 150.0.7861.0 or newer and the WebMCP testing flag.
Record the actual browser and extension versions; use manual execution with no
provider/key setup. These requirements were checked on 2026-08-28 and may change.

The automated suite runs the real bundle, dialog, collector, and PostgreSQL, with
explicit model-context doubles for most invocation tests. The native permissions
policy test establishes registration denial under `Permissions-Policy: tools=()`;
it does not establish native invocation or agent selection. Native DevTools and
Inspector acceptance remain unrecorded, as stated in
[verification results](verification-results.md). Never present a double as native
browser evidence or a skipped native test as passing.

## Evaluation method

The [eval protocol](webmcp-evals.md) defines four positive prompts (observed bug,
blocked task, confusing behavior, concrete idea) and five negative prompts
(unrelated request, hypothetical problem, insufficient evidence, duplicate,
sensitive-data request). Reproduce the setup, use fresh conversations, hide the
expected arguments from the agent, and leave tool selection unforced. Repeat
trials without discarding failures.

Measure appropriate tool selection, argument quality before human edits,
unnecessary invocation, and the complete confirmed journey through inbox
persistence. Record numerator/denominator, environment, actual calls, and human
confirmation separately. Zero attempted trials means not measured, not a success
rate. The demo task explicitly suggests feedback in its output; record that cue
instead of claiming unaided discovery.

The [ledger](webmcp-eval-results.md) currently has no real agent trials. Validating
the example JSON only checks corpus compatibility. The
[ChatGPT Site Tools script](site-tools-test-script.md) is prepared for later
authorized testing; no availability, deployment, or successful run is claimed.

## Trust and privacy

Only reviewed report fields, the SDK version, optional static labels, project key,
schema version, and event ID leave the SDK. The collector derives request origin,
receipt identity/time, and the unverified source label. The SDK does not collect
ambient page data or credentials. It reconstructs closed receipt output instead
of returning collector prose to the agent. Review, bounded transport, and
text-only inbox rendering protect distinct boundaries; metadata hints are not
security enforcement. See [security and data handling](security.md).

## Known limitations and release gates

- Native API support varies. The SDK requires an execution `AbortSignal`; older
  callback options can register yet return `invalid_input` on invocation.
- The SDK does not include its own dialog. Integrators must install the review
  adapter and provide a collector. Packages remain private, version `0.0.0`;
  there is no hosted service or production deployment configuration.
- The inbox is public, origin checks are not authentication, and users can paste
  sensitive data into text fields. Use synthetic data only. Semantic duplicates
  with new event IDs are not detected automatically.
- The collector counts some string limits in UTF-16 units while the SDK contract
  uses Unicode code points. Near-limit supplementary characters can be rejected
  after valid SDK review. This discrepancy is documented, not silently normalized
  by changing the frozen protocol.
- Abort after dispatch cannot undo a server write. Explicit retry state is only
  in memory and is lost on reload or disposal.
- Feedback remains public until an operator runs cleanup after the 24-hour
  threshold. Log retention is operator-owned; no cleanup scheduler is configured.
- Keyboard, focus, semantic markup, and automated accessibility assertions do
  not replace a human screen-reader session. Do not claim universal accessibility
  or model reliability from automated tests.
- Native DevTools/Inspector checks, real agent metrics, and later Site Tools
  acceptance remain open. Artifact checksums and a protocol freeze identify a
  candidate; they do not by themselves authorize publishing or release approval.
