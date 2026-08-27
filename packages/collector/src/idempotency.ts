import { IDEMPOTENCY_HEADER, isIdempotencyKeyMatching } from "./endpoint-contract";

export function readEventId(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return typeof record.eventId === "string" ? record.eventId : null;
}

export function checkIdempotency(value: unknown, request: Request): boolean {
  const eventId = readEventId(value);

  if (eventId === null) {
    return false;
  }

  return isIdempotencyKeyMatching(eventId, request.headers.get(IDEMPOTENCY_HEADER));
}
