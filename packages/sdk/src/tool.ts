import { FEEDBACK_DRAFT_SCHEMA } from "./envelope";

// Host configuration and agent content must never be interpolated into metadata.
export const FEEDBACK_TOOL = {
  name: "filika_submit_feedback",
  title: "Submit feedback for review",
  description:
    "Draft feedback about an observed bug, blocked task, confusing behavior, or concrete improvement idea in this application. " +
    "The user must review and explicitly confirm before anything is sent. " +
    "Describe only evidence available from the current task; do not invent failures, repeat an existing report, or include credentials or personal data. " +
    "Do not use for unrelated requests or hypothetical problems. A draft is not proof of submission; only a success receipt confirms acceptance.",
  inputSchema: FEEDBACK_DRAFT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    untrustedContentHint: false,
  },
} as const;

export interface FilikaToolExecutionOptions {
  signal: AbortSignal;
}

export interface FilikaModelContextTool<Result> {
  name: typeof FEEDBACK_TOOL.name;
  title: typeof FEEDBACK_TOOL.title;
  description: typeof FEEDBACK_TOOL.description;
  inputSchema: typeof FEEDBACK_TOOL.inputSchema;
  annotations: typeof FEEDBACK_TOOL.annotations;
  execute(input: unknown, options: FilikaToolExecutionOptions): Promise<Result>;
}

export interface FilikaModelContext<Result> {
  registerTool(
    tool: FilikaModelContextTool<Result>,
    options: { signal: AbortSignal },
  ): Promise<void>;
}
