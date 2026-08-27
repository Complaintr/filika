import { FILIKA_FEEDBACK_ENVELOPE_V1, type FilikaFeedbackEnvelopeV1 } from "./envelope";

export type EnvelopeValidationResult =
  | { envelope: FilikaFeedbackEnvelopeV1; ok: true }
  | { ok: false };

export function validateEnvelope(value: unknown): EnvelopeValidationResult {
  const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(value);

  if (!result.success) {
    return { ok: false };
  }

  return { envelope: result.data, ok: true };
}
