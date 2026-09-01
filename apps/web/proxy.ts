import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    ["/login", "/register", "/forgot-password", "/reset-password", "/terms"].includes(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/_next") ||
    pathname === "/app.css" ||
    pathname === "/favicon.ico" ||
    pathname === "/filika-logo.svg" ||
    pathname === "/icon.svg" ||
    /\.(jpe?g|png|webp|svg|ico|css|js|woff2?)$/i.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession =
    request.cookies.has(SESSION_COOKIE) || request.cookies.has(`__Secure-${SESSION_COOKIE}`);
  const forceLogin = searchParams.has("force") || searchParams.has("reauth");

  if (!isPublicPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession && !forceLogin) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname === "/login" && forceLogin) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(`__Secure-${SESSION_COOKIE}`);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
