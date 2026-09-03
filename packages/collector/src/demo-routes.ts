import { eq } from "drizzle-orm";
import { demoCreationAllowed, deviceDemoApplication, deviceKeySchema } from "./applications";
import type { Db } from "./db/client";
import { project } from "./db/schema";
import { DEMO_ALLOWED_ORIGINS } from "./db/seed";
import { type DemoCreationLimiter, demoClientKey, demoCreationLimiter } from "./demo-create-limit";
import { getInboxFeedback, listInbox } from "./inbox";
import { parseListQuery } from "./inbox-query";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const failure = (category: string, status: number) => json({ error: { category } }, status);

const FEEDBACK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function demoProject(
  db: Db,
  device: string,
  request: Request,
  create: boolean,
  limiter: DemoCreationLimiter,
) {
  if (!deviceKeySchema.safeParse(device).success) return null;
  if (create && !(await demoCreationAllowed(db))) return null;
  if (create) {
    // Only brand-new device projects consume the per-client budget; refreshing
    // an existing project stays free so re-opening the demo never blocks.
    const existing = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.slug, `demo-${device}`))
      .limit(1);
    if (existing.length === 0 && !limiter.allow(demoClientKey(request))) return null;
  }
  const allowedOrigins = demoOrigins(request);
  return deviceDemoApplication(db, device, { allowedOrigins });
}

/**
 * The demo storefront is served from the same origin that hosts the collector
 * API, so the device project must accept that origin in addition to the seeded
 * development origins. Trust BETTER_AUTH_URL over request.url: a reverse proxy
 * (for example Coolify) may present an internal origin in request.url, which
 * would never match the public origin the SDK sends in the Origin header.
 */
function demoOrigins(request: Request): readonly string[] {
  const origins = new Set<string>(DEMO_ALLOWED_ORIGINS);
  const candidates = [process.env.BETTER_AUTH_URL, new URL(request.url).origin].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  for (const value of candidates) {
    try {
      const url = new URL(value);
      const localHttp =
        url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (url.protocol === "https:" || localHttp) origins.add(url.origin);
    } catch {
      // Keep the seeded origins when the origin cannot be parsed.
    }
  }
  return [...origins];
}

/**
 * Public demo routes. Reports belong to a device, not an account, so these
 * endpoints never require a session. Device keys are opaque client identifiers
 * that only gate access to the matching demo project.
 */
export async function handleDemoRoute(
  db: Db,
  request: Request,
  options: { limiter?: DemoCreationLimiter } = {},
): Promise<Response> {
  const url = new URL(request.url);
  const limiter = options.limiter ?? demoCreationLimiter;

  if (url.pathname === "/api/v1/demo/checkout" && request.method === "POST") {
    // Deterministic demo failure: the order never completes.
    return Response.json(
      { error: { category: "checkout_timeout" } },
      { status: 504, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (request.method !== "GET") return failure("method_not_allowed", 405);

  const match = /^\/api\/v1\/demo\/([^/]+)(?:\/(app|inbox)(?:\/([^/]+))?)?$/.exec(url.pathname);
  if (!match?.[1] || !match[2]) return failure("not_found", 404);
  const app = await demoProject(db, match[1], request, match[2] === "app", limiter);
  if (app === null) return failure(match[2] === "app" ? "demo_unavailable" : "invalid_input", 400);

  if (match[2] === "app") return json({ application: app });
  if (request.method !== "GET") return failure("method_not_allowed", 405);
  if (match[2] === "inbox") {
    if (!match[3]) return json(await listInbox(db, parseListQuery(url), app.id));
    if (!FEEDBACK_ID_PATTERN.test(match[3])) return failure("not_found", 404);
    const feedback = await getInboxFeedback(db, match[3], app.id);
    return feedback ? json({ feedback }) : failure("not_found", 404);
  }
  return failure("not_found", 404);
}

export function isDemoRoute(path: string): boolean {
  return (
    path === "/api/v1/demo/checkout" ||
    /^\/api\/v1\/demo\/[^/]+(?:\/(?:app|inbox)(?:\/[^/]+)?)?$/.test(path)
  );
}
