export const runtime = "nodejs";
export function GET(request: Request) {
  const url = new URL(request.url);
  return Response.json({
    url: request.url,
    origin: url.origin,
    host: request.headers.get("host"),
    originHeader: request.headers.get("origin"),
    xForwardedProto: request.headers.get("x-forwarded-proto"),
  });
}
