import type { FilikaConfig } from "./config";
import { createContext, reviewedContext } from "./context";
import {
  FEEDBACK_KINDS,
  FEEDBACK_LIMITS,
  type FilikaFeedbackDraftV1,
  type FilikaFeedbackEnvelopeV1,
  UUID_V4_PATTERN,
} from "./envelope";
import { boundedString, closedRecord } from "./validation";

export function withinByteLimit(text: string, limit: number): boolean {
  return text.length <= limit && new TextEncoder().encode(text).byteLength <= limit;
}

export function parseDraft(input: unknown): FilikaFeedbackDraftV1 | null {
  try {
    const value = closedRecord(input, [
      "kind",
      "title",
      "description",
      "expectedBehavior",
      "reproductionSteps",
    ]);
    if (
      !value ||
      !FEEDBACK_KINDS.some((kind) => kind === value.kind) ||
      !boundedString(value.title, FEEDBACK_LIMITS.title, true) ||
      !boundedString(value.description, FEEDBACK_LIMITS.description, true)
    )
      return null;
    const result: FilikaFeedbackDraftV1 = {
      kind: value.kind as FilikaFeedbackDraftV1["kind"],
      title: value.title,
      description: value.description,
    };
    if (Object.hasOwn(value, "expectedBehavior")) {
      if (!boundedString(value.expectedBehavior, FEEDBACK_LIMITS.expectedBehavior)) return null;
      result.expectedBehavior = value.expectedBehavior;
    }
    if (Object.hasOwn(value, "reproductionSteps")) {
      const steps: unknown = value.reproductionSteps;
      if (!Array.isArray(steps) || steps.length > FEEDBACK_LIMITS.reproductionSteps) return null;
      const descriptors = Object.getOwnPropertyDescriptors(steps);
      if (Reflect.ownKeys(steps).length !== steps.length + 1) return null;
      result.reproductionSteps = [];
      for (let index = 0; index < steps.length; index++) {
        const descriptor = descriptors[String(index)];
        if (
          !descriptor ||
          !("value" in descriptor) ||
          !boundedString(descriptor.value, FEEDBACK_LIMITS.reproductionStep, true)
        )
          return null;
        result.reproductionSteps.push(descriptor.value);
      }
    }
    return withinByteLimit(JSON.stringify(result), FEEDBACK_LIMITS.toolInputBytes) ? result : null;
  } catch {
    return null;
  }
}

export interface PreparedSubmission {
  readonly eventId: string;
  readonly body: string;
}

export function prepareSubmission(
  config: Readonly<FilikaConfig>,
  feedback: unknown,
  context: unknown,
  randomUUID: () => string = () => crypto.randomUUID(),
): PreparedSubmission | null {
  try {
    const draft = parseDraft(feedback);
    const approvedContext = reviewedContext(context, createContext(config));
    if (!draft || !approvedContext) return null;
    const eventId = randomUUID();
    if (
      typeof eventId !== "string" ||
      eventId.length !== 36 ||
      !new RegExp(UUID_V4_PATTERN).test(eventId)
    )
      return null;
    const envelope: FilikaFeedbackEnvelopeV1 = {
      schemaVersion: 1,
      projectKey: config.projectKey,
      eventId,
      feedback: draft,
      context: approvedContext,
    };
    const body = JSON.stringify(envelope);
    return withinByteLimit(body, FEEDBACK_LIMITS.envelopeBytes)
      ? Object.freeze({ eventId, body })
      : null;
  } catch {
    return null;
  }
}

export function submissionHeaders(submission: PreparedSubmission): Record<string, string> {
  return { "Content-Type": "application/json", "Idempotency-Key": submission.eventId };
}
