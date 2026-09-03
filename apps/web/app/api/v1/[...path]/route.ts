import { createBetterAuth } from "@filika/collector/auth/better-auth";
import { createDb } from "@filika/collector/db/client";
import { githubConfigFromEnv } from "@filika/collector/github/config";
import { createFetchHandler } from "@filika/collector/handler";
import { after } from "next/server";

export const runtime = "nodejs";

const handle = createDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/filika");
const betterAuth = createBetterAuth(handle.db, {
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.AUTH_EMAIL_FROM,
  runInBackground: (promise) => after(() => promise.then(() => {})),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
});
const fetchHandler = createFetchHandler(handle.db, {
  betterAuth,
  github: githubConfigFromEnv(),
  runInBackground: (task) => after(task),
});

export function GET(request: Request): Promise<Response> {
  return fetchHandler(request);
}

export function POST(request: Request): Promise<Response> {
  return fetchHandler(request);
}

export function PATCH(request: Request): Promise<Response> {
  return fetchHandler(request);
}

export function DELETE(request: Request): Promise<Response> {
  return fetchHandler(request);
}

export function OPTIONS(request: Request): Promise<Response> {
  return fetchHandler(request);
}
