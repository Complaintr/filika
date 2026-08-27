export const SAMPLE_FAILURE_CODE = "FILIKA_DEMO_SAVE_CONFLICT";
export const SAMPLE_FAILURE_MESSAGE =
  "The sample draft could not be saved. Reset it and try again.";

export type SampleFailureState =
  | { status: "ready" }
  | { code: typeof SAMPLE_FAILURE_CODE; message: typeof SAMPLE_FAILURE_MESSAGE; status: "failed" }
  | { status: "resetting" };

export type SampleFailureEvent =
  | { type: "RUN_SAMPLE" }
  | { type: "RESET" }
  | { type: "RESET_COMPLETE" };

export const INITIAL_SAMPLE_FAILURE_STATE: SampleFailureState = { status: "ready" };

export function transitionSampleFailure(
  state: SampleFailureState,
  event: SampleFailureEvent,
): SampleFailureState {
  if (state.status === "ready" && event.type === "RUN_SAMPLE") {
    return {
      code: SAMPLE_FAILURE_CODE,
      message: SAMPLE_FAILURE_MESSAGE,
      status: "failed",
    };
  }

  if (state.status === "failed" && event.type === "RESET") {
    return { status: "resetting" };
  }

  if (state.status === "resetting" && event.type === "RESET_COMPLETE") {
    return INITIAL_SAMPLE_FAILURE_STATE;
  }

  return state;
}

export const SAMPLE_FAILURE_VISIBLE_STATES = {
  failed: {
    action: "Reset sample",
    description: SAMPLE_FAILURE_MESSAGE,
    heading: "Sample save failed",
  },
  ready: {
    action: "Run sample task",
    description: "Run the task to produce the same visible failure every time.",
    heading: "Sample draft is ready",
  },
  resetting: {
    action: null,
    description: "Restoring the sample draft.",
    heading: "Resetting sample",
  },
} as const satisfies Record<SampleFailureState["status"], unknown>;
