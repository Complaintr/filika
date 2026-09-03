import { and, eq } from "drizzle-orm";
import { accountSettingsSchema, getAccountProfile } from "./account-profile";
import {
  applicationSettingsSchema,
  applicationView,
  createApplication,
  createApplicationSchema,
  listApplications,
  ownedApplication,
} from "./applications";
import { getDashboard } from "./dashboard";
import type { Db } from "./db/client";
import { project, user } from "./db/schema";
import { getInboxFeedback, listInbox } from "./inbox";
import { parseListQuery } from "./inbox-query";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const failure = (category: string, status: number) => json({ error: { category } }, status);

async function readSettings(request: Request): Promise<unknown> {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? ""))
    throw new Error("Invalid content type");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Read timeout")), 5000);
  });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const part = await Promise.race([reader.read(), timeout]);
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 16_384) throw new Error("Body too large");
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
  }
}

export async function handleApplicationRoute(
  db: Db,
  request: Request,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const mutation = request.method === "POST" || request.method === "PATCH";
  if (mutation && request.headers.get("origin") !== url.origin)
    return failure("denied_origin", 403);
  let input: unknown;
  if (mutation) {
    try {
      input = await readSettings(request);
    } catch {
      return failure("invalid_input", 400);
    }
  }
  if (url.pathname === "/api/v1/account") {
    const profile = await getAccountProfile(db, userId);
    if (!profile) return failure("unauthenticated", 401);
    if (request.method === "GET") return json({ account: profile });
    if (request.method === "PATCH") {
      const parsed = accountSettingsSchema.safeParse(input);
      if (!parsed.success) return failure("invalid_input", 400);
      if (parsed.data.useGoogleImage && !profile.googleImageAvailable)
        return failure("google_photo_unavailable", 400);
      if (parsed.data.useGithubImage && !profile.githubImageAvailable)
        return failure("github_photo_unavailable", 400);
      const updates = { ...parsed.data };
      if (updates.useGoogleImage) updates.useGithubImage = false;
      else if (updates.useGithubImage) updates.useGoogleImage = false;
      await db
        .update(user)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(user.id, userId));
      return json({ account: await getAccountProfile(db, userId) });
    }
    return failure("method_not_allowed", 405);
  }
  if (url.pathname === "/api/v1/apps") {
    if (request.method === "GET") return json({ applications: await listApplications(db, userId) });
    if (request.method === "POST") {
      const parsed = createApplicationSchema.safeParse(input);
      if (!parsed.success) return failure("invalid_input", 400);
      const result = await createApplication(db, userId, parsed.data);
      return "error" in result ? failure(result.error, 409) : json(result, 201);
    }
    return failure("method_not_allowed", 405);
  }
  const match = /^\/api\/v1\/apps\/([^/]+)(?:\/(dashboard|inbox)(?:\/([^/]+))?)?$/.exec(
    url.pathname,
  );
  if (!match?.[1]) return failure("not_found", 404);
  const app = await ownedApplication(db, userId, match[1]);
  if (!app) return failure("not_found", 404);
  if (!match[2]) {
    if (request.method === "GET") return json({ application: applicationView(app) });
    if (request.method === "PATCH") {
      const parsed = applicationSettingsSchema.safeParse(input);
      if (!parsed.success) return failure("invalid_input", 400);
      const rows = await db
        .update(project)
        .set(parsed.data)
        .where(and(eq(project.id, app.id), eq(project.ownerUserId, userId)))
        .returning();
      return rows[0] ? json({ application: applicationView(rows[0]) }) : failure("not_found", 404);
    }
    return failure("method_not_allowed", 405);
  }
  if (request.method !== "GET") return failure("method_not_allowed", 405);
  if (match[2] === "dashboard" && !match[3]) {
    const requested = url.searchParams.get("days");
    const days = requested === "7" ? 7 : requested === "90" ? 90 : 30;
    return json(await getDashboard(db, days, new Date(), app.id));
  }
  if (match[2] === "inbox") {
    if (!match[3]) return json(await listInbox(db, parseListQuery(url), app.id));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match[3]))
      return failure("not_found", 404);
    const feedback = await getInboxFeedback(db, match[3], app.id);
    return feedback ? json({ feedback }) : failure("not_found", 404);
  }
  return failure("not_found", 404);
}
