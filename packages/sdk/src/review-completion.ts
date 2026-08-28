import type { FilikaExecutionOutcome } from "./receipt";

interface ReviewCompletion {
  readonly decision: unknown;
  settle(outcome: FilikaExecutionOutcome): void;
}

const completions = new WeakMap<object, ReviewCompletion>();

export function createReviewCompletion(decision: unknown): {
  readonly outcome: Promise<FilikaExecutionOutcome>;
  settle(outcome: FilikaExecutionOutcome): void;
  readonly token: object;
} {
  const deferred = Promise.withResolvers<FilikaExecutionOutcome>();
  const token = Object.freeze({});
  let settled = false;
  const settle = (outcome: FilikaExecutionOutcome): void => {
    if (settled) {
      return;
    }
    settled = true;
    deferred.resolve(outcome);
  };
  completions.set(token, { decision, settle });
  return { outcome: deferred.promise, settle, token };
}

export function takeReviewCompletion(value: unknown): ReviewCompletion | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const completion = completions.get(value);
  if (completion === undefined) {
    return null;
  }
  completions.delete(value);
  return completion;
}
