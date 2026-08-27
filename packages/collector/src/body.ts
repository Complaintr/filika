import { FEEDBACK_MAX_BODY_BYTES } from "./endpoint-contract";

export type BoundedBodyResult =
  | { bytes: Uint8Array; ok: true }
  | { ok: false; reason: "oversized" };

export async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const length = Number.parseInt(contentLength, 10);

    if (Number.isFinite(length) && length > FEEDBACK_MAX_BODY_BYTES) {
      return { ok: false, reason: "oversized" };
    }
  }

  if (request.body === null) {
    return { bytes: new Uint8Array(), ok: true };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = request.body.getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value !== undefined) {
      total += value.byteLength;

      if (total > FEEDBACK_MAX_BODY_BYTES) {
        await reader.cancel();

        return { ok: false, reason: "oversized" };
      }

      chunks.push(value);
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, ok: true };
}
