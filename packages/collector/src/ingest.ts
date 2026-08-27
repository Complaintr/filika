import { readBoundedBody } from "./body";
import type { Db } from "./db/client";
import { rejectionResponse } from "./errors";
import { checkOrigin } from "./origin";

export async function ingestFeedback(_db: Db, request: Request): Promise<Response> {
  const originCheck = checkOrigin(request);

  if (originCheck.status === "rejected") {
    return rejectionResponse("denied_origin");
  }

  const body = await readBoundedBody(request);

  if (!body.ok) {
    return rejectionResponse("payload_too_large");
  }

  return new Response("Not implemented.", { status: 501 });
}
