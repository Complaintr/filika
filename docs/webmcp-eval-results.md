# WebMCP evaluation ledger

Status recorded on 2026-08-28. Corpus: [positive](../tests/evals/positive.json)
and [negative](../tests/evals/negative.json). Rules: [evaluation protocol](webmcp-evals.md).
SDK baseline: `e94680f9763614fddaf7810ae73eb8b941dd9289`.

## Agent trials

**Not run.** No compatible agent-selection trial has been executed against the
native page tools. Native DevTools and Inspector acceptance are still open, and
no AI provider or account was configured. The corpus defines tests; it is not a
record of predictions. Manual calls and model-context doubles are not agent
selection evidence. Agent/model version and native browser version are therefore
not recorded for this ledger.

| Scenario | Status | Feedback call count | Argument quality | Journey result |
| --- | --- | --- | --- | --- |
| observed-bug | Not run | Not observed | Not measured | Not measured |
| blocked-task | Not run | Not observed | Not measured | Not measured |
| confusing-behavior | Not run | Not observed | Not measured | Not measured |
| concrete-idea | Not run | Not observed | Not measured | Not measured |
| unrelated-request | Not run | Not observed | N/A | Not measured |
| hypothetical-problem | Not run | Not observed | N/A | Not measured |
| insufficient-evidence | Not run | Not observed | N/A | Not measured |
| duplicate-report | Not run | Not observed | N/A | Not measured |
| sensitive-data-request | Not run | Not observed | N/A | Not measured |

## Metrics

| Metric | Observed numerator / denominator | Result |
| --- | --- | --- |
| Positive tool-selection success | 0 / 0 attempted positive trials | Not measured |
| Argument quality | 0 / 0 observed positive feedback calls | Not measured |
| Unnecessary invocation | 0 / 0 attempted negative trials | Not measured |
| Full-journey completion | 0 / 0 attempted confirmation trials | Not measured |

Zero attempts are not zero failures or a passing rate. All nine scenarios remain
unexecuted, with cancellation repeats also outstanding. An unavailable runtime
must not be hidden by excluding it from a claimed overall pass.

## Separate deterministic evidence

The four positive example drafts passed the actual frozen JSON Schema through
`packages/sdk/test/tool.test.ts`. The
[clean-checkout baseline](verification-results.md) passed 405 unit/API tests and
22 browser tests. Browser confirmation, cancellation, retry, and inbox assertions
establish deterministic runtime behavior with the documented doubles. They do
not populate any of the four agent metrics above.

## Recording a real trial

Add a dated trial record only after execution. Identify its source/corpus revision,
SDK hash, native Chrome version, Inspector version if used, agent/model version,
scenario and repetition. Record whether the demo-task output's feedback cue was
visible. Include the actual tool counts, synthetic arguments, each argument
grade, review action, before/after POST counts, outcome, and receipt/inbox match.
Explain failures and blocked setup separately. Recalculate aggregates from all
attempted trials, leaving unrun trials explicitly visible. Never replace this
baseline with invented examples presented as observations.
