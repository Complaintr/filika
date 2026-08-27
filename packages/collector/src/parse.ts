import { FEEDBACK_CONTENT_TYPE } from "./endpoint-contract";

export type DecodeResult = { ok: true; value: unknown } | { ok: false; reason: "invalid_input" };

export function decodeJsonBody(bytes: Uint8Array, contentType: string | null): DecodeResult {
  if (contentType !== FEEDBACK_CONTENT_TYPE) {
    return { ok: false, reason: "invalid_input" };
  }

  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, reason: "invalid_input" };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalid_input" };
  }
}
