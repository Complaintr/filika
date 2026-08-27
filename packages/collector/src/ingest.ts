import { readBoundedBody } from "./body";
import type { Db } from "./db/client";
import { rejectionResponse } from "./errors";
import { checkOrigin } from "./origin";
import { decodeJsonBody } from "./parse";
import { isOriginAllowed, resolveProject } from "./project";
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

  return new Response("Not implemented.", { status: 501 });
}
