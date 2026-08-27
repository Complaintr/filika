import { readBoundedBody } from "./body";
import type { Db } from "./db/client";
import { buildAcceptedReceipt, buildDuplicateReceipt } from "./duplicate";
import { rejectionResponse } from "./errors";
import { checkIdempotency } from "./idempotency";
import { checkOrigin } from "./origin";
import { decodeJsonBody } from "./parse";
import { persistFeedback } from "./persistence";
import { isOriginAllowed, resolveProject } from "./project";
import { consumeProjectRateLimit } from "./rate-limiting";
import { buildServerOwnedValues } from "./server-owned";
import { validateEnvelope } from "./validate";

export async function ingestFeedback(db: Db, request: Request): Promise<Response> {
  const originCheck = checkOrigin(request);

  if (originCheck.status === "rejected") {
    return rejectionResponse("denied_origin");
  }

  const body = await readBoundedBody(request);

  if (!body.ok) {
    return rejectionResponse("payload_too_large");
  }

  const decoded = decodeJsonBody(body.bytes, request.headers.get("content-type"));

  if (!decoded.ok) {
    return rejectionResponse("invalid_input");
  }

  if (!checkIdempotency(decoded.value, request)) {
    return rejectionResponse("invalid_input");
  }

  const validated = validateEnvelope(decoded.value);

  if (!validated.ok) {
    return rejectionResponse("invalid_input");
  }

  const resolvedProject = await resolveProject(db, validated.envelope.projectKey);

  if (resolvedProject === null) {
    return rejectionResponse("project_not_found");
  }

  if (!isOriginAllowed(originCheck.origin, resolvedProject.allowedOrigins)) {
    return rejectionResponse("denied_origin");
  }

  const rateLimit = await consumeProjectRateLimit(db, resolvedProject.id, new Date());

  if (!rateLimit.allowed) {
    return rejectionResponse("rate_limited");
  }

  const serverValues = buildServerOwnedValues(new Date(), originCheck.origin);
  const persisted = await persistFeedback(db, {
    context: validated.envelope.context,
    eventId: validated.envelope.eventId,
    feedback: validated.envelope.feedback,
    origin: originCheck.origin,
    projectId: resolvedProject.id,
    receivedAt: serverValues.receivedAt,
    source: serverValues.source,
  }).catch(() => null);

  if (persisted === null) {
    return rejectionResponse("internal_error");
  }

  const stored = persisted.feedback;
  const receivedAt = stored.receiptTimestamp.toISOString();
  const receipt =
    persisted.outcome === "created"
      ? buildAcceptedReceipt(stored.eventId, stored.id, receivedAt)
      : buildDuplicateReceipt({
          eventId: stored.eventId,
          feedbackId: stored.id,
          receivedAt,
        });

  return Response.json(receipt, {
    status: persisted.outcome === "created" ? 201 : 200,
  });
}
