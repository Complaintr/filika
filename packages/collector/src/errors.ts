import type { FeedbackErrorCategory } from "./endpoint-contract";

export const ERROR_CATEGORY_STATUS = {
  denied_origin: 403,
  internal_error: 500,
  invalid_input: 400,
  payload_too_large: 413,
  project_not_found: 400,
} as const satisfies Record<FeedbackErrorCategory, number>;

export function rejectionResponse(category: FeedbackErrorCategory): Response {
  return Response.json({ error: { category } }, { status: ERROR_CATEGORY_STATUS[category] });
}
