import { CORS_CONTRACT, FEEDBACK_ALLOWED_HEADERS } from "./endpoint-contract";

export function isAllowedOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  return allowedOrigins.includes(origin);
}

export function allowOriginHeaders(request: Request, allowedOrigins: readonly string[]): Headers {
  const origin = request.headers.get("origin");

  if (origin !== null && isAllowedOrigin(origin, allowedOrigins)) {
    return new Headers({ "access-control-allow-origin": origin, vary: "Origin" });
  }

  return new Headers();
}

export function buildPreflightResponse(
  request: Request,
  allowedOrigins: readonly string[],
): Response {
  const origin = request.headers.get("origin");

  if (origin === null || !isAllowedOrigin(origin, allowedOrigins)) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    headers: {
      "access-control-allow-headers": FEEDBACK_ALLOWED_HEADERS.join(", "),
      "access-control-allow-methods": CORS_CONTRACT.allowedMethods.join(", "),
      "access-control-allow-origin": origin,
      vary: "Origin",
    },
    status: 204,
  });
}
