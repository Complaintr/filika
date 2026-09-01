import { createBetterAuth } from "./auth/better-auth";
import { createDb } from "./db/client";
import { type GitHubConfig, githubConfigFromEnv } from "./github/config";
import { createFetchHandler } from "./handler";

export { createBetterAuth, createFetchHandler };

export const COLLECTOR_DEFAULT_PORT = 8787 as const;

export interface CollectorServerOptions {
  github?: GitHubConfig | undefined;
  databaseUrl: string;
  resendApiKey?: string | undefined;
  emailFrom?: string | undefined;
  port?: number | undefined;
  baseURL?: string | undefined;
  secret?: string | undefined;
  googleClientId?: string | undefined;
  googleClientSecret?: string | undefined;
  /** Disables the session guard on protected routes. Intended for tests. */
  enableAuth?: boolean | undefined;
}

export function startCollectorServer(
  options: CollectorServerOptions,
): ReturnType<typeof Bun.serve> {
  const handle = createDb(options.databaseUrl);
  const betterAuth = createBetterAuth(handle.db, {
    resendApiKey: options.resendApiKey,
    emailFrom: options.emailFrom,
    baseURL: options.baseURL,
    secret: options.secret,
    googleClientId: options.googleClientId,
    googleClientSecret: options.googleClientSecret,
  });
  const fetchHandler = createFetchHandler(handle.db, {
    betterAuth: options.enableAuth === false ? undefined : betterAuth,
    github: options.github,
    runInBackground: (task) => void task().catch(() => {}),
  });

  return Bun.serve({
    fetch: async (request) => {
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/auth/")) {
        return betterAuth.handler(request);
      }

      return fetchHandler(request);
    },
    port: options.port ?? COLLECTOR_DEFAULT_PORT,
  });
}

if (import.meta.main) {
  startCollectorServer({
    github: githubConfigFromEnv(),
    databaseUrl: process.env.DATABASE_URL ?? "postgres://localhost:5432/filika",
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.AUTH_EMAIL_FROM,
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });
}
