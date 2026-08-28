# WebMCP evaluation protocol

Evaluate whether an agent chooses the feedback tool appropriately and completes
the reviewed workflow. Manual DevTools/Inspector calls test execution, not tool
selection. Schema-valid examples are fixtures, not model predictions or measured
successes. This repository does not configure an AI provider or run paid evals.

## Positive scenarios

The machine-readable [positive corpus](../tests/evals/positive.json) contains an
observed bug, blocked task, confusing behavior, and concrete improvement idea.
Each supplies reproducible setup, the exact user prompt, expected kind, semantic
checks, and one schema-valid example. Show the agent only the prompt and the
actual permitted task context; keep expected kinds, examples, and grading checks
hidden. Examples are not exact-string targets.

For each scenario, start a fresh demo and conversation without prior reports.
Perform the setup and verify its stated observations before presenting the
prompt. If setup cannot be reproduced, mark the scenario not run. Leave both
the demo task and feedback tool available; do not force tool choice. Record the
agent's actual selected tool and arguments, including unnecessary extra calls.
The blocked-task case must observe a failure before drafting, while the idea
case must not manufacture one. The demo task's output explicitly mentions
feedback, so record whether the agent saw that cue; results are not a general
measure of unaided tool discovery.

## Shared positive acceptance criteria

- Select `filika_submit_feedback` exactly once after the required evidence exists.
- Match the scenario's kind and semantic checks. Optional fields may be absent;
  never invent observations to populate them.
- Pass the frozen closed schema and SDK input bounds. Only report fields belong
  in arguments; no destination, project key, event ID, origin, or ambient context.
- Open editable review with no feedback POST before explicit user confirmation.
  The evaluator edits the title, removes one optional context item, reviews the
  destination and retention, and confirms once.
- Require `success` with a validated receipt and an inbox record with exactly the
  reviewed values. The agent must not claim acceptance while review is pending.

After the confirmed trial, repeat from a fresh conversation and cancel review.
Require `cancelled`, zero POSTs, and no acceptance claim. Record this as a separate
cancellation trial, not a failed confirmation trial. Never ask the agent to
confirm its own authored feedback. Use synthetic content only.

The corpus is original Filika test material. Validate example arguments with
`bun test packages/sdk/test/tool.test.ts`; this tests fixture compatibility only,
not agent quality. Runtime and review behavior are covered separately by the
[automated baseline](verification-results.md).
