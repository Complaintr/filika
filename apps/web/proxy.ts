import { type NextRequest, NextResponse } from "next/server";

const SPA_ROUTE = /^\/(?:dashboard|complaints(?:\/[^/]+)?|settings)(?:\?.*)?$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.method === "GET" && SPA_ROUTE.test(pathname)) {
    return NextResponse.rewrite(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|sdk|fixtures|index\\.js|app\\.css).*)"],
};
