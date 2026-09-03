/**
 * The public origin a browser sends in the Origin header. Behind a reverse
 * proxy (for example Coolify) request.url carries an internal origin, so trust
 * BETTER_AUTH_URL first and fall back to the request URL when it is not set.
 */
export function publicOriginFromRequest(request: Request): string {
  const candidate = process.env.BETTER_AUTH_URL;
  if (candidate !== undefined && candidate.length > 0) {
    try {
      return new URL(candidate).origin;
    } catch {
      // Fall back to the request URL when the configured base URL is invalid.
    }
  }
  return new URL(request.url).origin;
}
