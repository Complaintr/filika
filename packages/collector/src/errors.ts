import type { FeedbackErrorCategory } from "./endpoint-contract";

export const ERROR_CATEGORY_STATUS = {
  denied_origin: 403,
  internal_error: 500,
  invalid_input: 400,
  payload_too_large: 413,
  project_not_found: 400,
  rate_limited: 429,
} as const satisfies Record<FeedbackErrorCategory, number>;

export function rejectionResponse(
  category: FeedbackErrorCategory,
  headers?: HeadersInit,
): Response {
  const init: ResponseInit = { status: ERROR_CATEGORY_STATUS[category] };

  if (headers !== undefined) {
    init.headers = headers;
  }

  return Response.json({ error: { category } }, init);
}
