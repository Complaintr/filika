export const USER_JOURNEY_STAGE_IDS = [
  "task_ready",
  "failure_visible",
  "agent_draft_ready",
  "report_review",
  "confirmation",
  "receipt_visible",
  "inbox_list",
  "inbox_detail",
] as const;

export type UserJourneyStageId = (typeof USER_JOURNEY_STAGE_IDS)[number];

export interface UserJourneyStage {
  actor: "agent" | "maintainer" | "system" | "user";
  entryCondition: string;
  id: UserJourneyStageId;
  next: UserJourneyStageId | null;
  userVisibleResult: string;
}

export const USER_JOURNEY: readonly UserJourneyStage[] = [
  {
    actor: "user",
    entryCondition: "The deterministic sample task is ready.",
    id: "task_ready",
    next: "failure_visible",
    userVisibleResult: "The normal task and its expected action are visible.",
  },
  {
    actor: "system",
    entryCondition: "The sample task is triggered.",
    id: "failure_visible",
    next: "agent_draft_ready",
    userVisibleResult: "A stable failure message and Reset action are visible.",
  },
  {
    actor: "agent",
    entryCondition: "The agent observes the visible failure and chooses Filika.",
    id: "agent_draft_ready",
    next: "report_review",
    userVisibleResult: "A draft report opens without transmitting data.",
  },
  {
    actor: "user",
    entryCondition: "The draft report is available.",
    id: "report_review",
    next: "confirmation",
    userVisibleResult: "Every outgoing field can be edited, cleared, or removed as allowed.",
  },
  {
    actor: "user",
    entryCondition: "Required report fields are valid.",
    id: "confirmation",
    next: "receipt_visible",
    userVisibleResult: "The destination, retention, and privacy summary are shown before Send.",
  },
  {
    actor: "system",
    entryCondition: "The collector accepts the confirmed report.",
    id: "receipt_visible",
    next: "inbox_list",
    userVisibleResult: "A bounded receipt is shown without echoing submitted report text.",
  },
  {
    actor: "maintainer",
    entryCondition: "The maintainer opens the read-only inbox.",
    id: "inbox_list",
    next: "inbox_detail",
    userVisibleResult: "The accepted report can be found in a bounded list.",
  },
  {
    actor: "maintainer",
    entryCondition: "The maintainer selects the report.",
    id: "inbox_detail",
    next: null,
    userVisibleResult: "Authored, host-supplied, and server-derived values are separated.",
  },
];
