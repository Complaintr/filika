import { readBoundedBody } from "./body";
import type { Db } from "./db/client";
import { buildAcceptedReceipt, buildDuplicateReceipt } from "./duplicate";
import { rejectionResponse } from "./errors";
import { checkIdempotency } from "./idempotency";
import { consoleLogger, type Logger } from "./logger";
import { checkOrigin } from "./origin";
import { decodeJsonBody } from "./parse";
import { persistFeedback } from "./persistence";
import { isOriginAllowed, resolveProject } from "./project";
import { consumeProjectRateLimit } from "./rate-limiting";
import { buildServerOwnedValues } from "./server-owned";
import { validateEnvelope } from "./validate";

function reject(logger: Logger, category: Parameters<typeof rejectionResponse>[0]): Response {
  logger.log({
    category,
    eventId: null,
    projectKey: null,
    type: "ingest_rejected",
  });

  return rejectionResponse(category);
}

export async function ingestFeedback(
  db: Db,
  request: Request,
  logger: Logger = consoleLogger,
): Promise<Response> {
  const originCheck = checkOrigin(request);

  if (originCheck.status === "rejected") {
    return reject(logger, "denied_origin");
  }

  const body = await readBoundedBody(request);

  if (!body.ok) {
    return reject(logger, "payload_too_large");
  }

  const decoded = decodeJsonBody(body.bytes, request.headers.get("content-type"));

  if (!decoded.ok) {
    return reject(logger, "invalid_input");
  }

  if (!checkIdempotency(decoded.value, request)) {
    return reject(logger, "invalid_input");
  }

  const validated = validateEnvelope(decoded.value);

  if (!validated.ok) {
    return reject(logger, "invalid_input");
  }

  const resolvedProject = await resolveProject(db, validated.envelope.projectKey);

  if (resolvedProject === null) {
    return reject(logger, "project_not_found");
  }

  if (!isOriginAllowed(originCheck.origin, resolvedProject.allowedOrigins)) {
    return reject(logger, "denied_origin");
  }

  const rateLimit = await consumeProjectRateLimit(db, resolvedProject.id, new Date());

  if (!rateLimit.allowed) {
    return reject(logger, "rate_limited");
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
    return reject(logger, "internal_error");
  }

  const stored = persisted.feedback;
  const receivedAt = stored.receiptTimestamp.toISOString();

  if (persisted.outcome === "duplicate") {
    logger.log({
      eventId: stored.eventId,
      feedbackId: stored.id,
      projectKey: validated.envelope.projectKey,
      type: "ingest_duplicate",
    });
  } else {
    logger.log({
      feedbackId: stored.id,
      projectKey: validated.envelope.projectKey,
      source: "web_sdk_unverified",
      type: "ingest_accepted",
    });
  }

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
