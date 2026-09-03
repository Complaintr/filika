import {
  ENVELOPE_FIELD_LIMITS,
  FILIKA_FEEDBACK_ENVELOPE_V1,
  type FilikaFeedbackEnvelopeV1,
} from "./envelope";

export type EnvelopeValidationResult =
  | { envelope: FilikaFeedbackEnvelopeV1; ok: true }
  | { ok: false };

export function validateEnvelope(value: unknown): EnvelopeValidationResult {
  const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(value);

  if (!result.success) {
    return { ok: false };
  }

  // The SDK refuses to transmit envelopes over the same byte budget; reject
  // them here as well so the two trust boundaries stay aligned.
  if (
    new TextEncoder().encode(JSON.stringify(result.data)).byteLength >
    ENVELOPE_FIELD_LIMITS.envelopeBytes
  ) {
    return { ok: false };
  }

  return { envelope: result.data, ok: true };
}
