import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { Db } from "../db/client";
import * as schema from "../db/schema";

export interface BetterAuthConfig {
  baseURL?: string | undefined;
  secret?: string | undefined;
  googleClientId?: string | undefined;
  googleClientSecret?: string | undefined;
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;

/**
 * Creates the Better Auth instance for the Filika workspace.
 *
 * Authentication is Google-only: an account is created automatically on the
 * first sign-in. The Google provider is only registered when credentials are
 * provided, so the server still boots without OAuth configuration (sign-in
 * simply reports the provider as unavailable).
 */
export function createBetterAuth(db: Db, config: BetterAuthConfig = {}) {
  const hasGoogleCredentials =
    config.googleClientId !== undefined &&
    config.googleClientSecret !== undefined &&
    config.googleClientId !== "" &&
    config.googleClientSecret !== "";

  return betterAuth({
    baseURL: config.baseURL ?? "http://localhost:4173",
    secret: config.secret,
    trustedOrigins: ["http://localhost:4173", "http://127.0.0.1:4173"],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders: {
      ...(hasGoogleCredentials
        ? {
            google: {
              clientId: config.googleClientId as string,
              clientSecret: config.googleClientSecret as string,
            },
          }
        : {}),
    },
  });
}
