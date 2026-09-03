import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { Db } from "../db/client";
import * as schema from "../db/schema";
import { githubPhotoUrl, googlePhotoUrl } from "../photo-url";
import { type AuthEmailConfig, createAuthMailer } from "./email";

export interface BetterAuthConfig extends AuthEmailConfig {
  runInBackground?: ((promise: Promise<unknown>) => void) | undefined;
  baseURL?: string | undefined;
  secret?: string | undefined;
  googleClientId?: string | undefined;
  googleClientSecret?: string | undefined;
  githubClientId?: string | undefined;
  githubClientSecret?: string | undefined;
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;

/** Creates Google and verified email/password authentication for the workspace. */
export function createBetterAuth(db: Db, config: BetterAuthConfig = {}) {
  const hasGoogleCredentials =
    config.googleClientId !== undefined &&
    config.googleClientSecret !== undefined &&
    config.googleClientId !== "" &&
    config.googleClientSecret !== "";

  const hasGithubCredentials =
    config.githubClientId !== undefined &&
    config.githubClientSecret !== undefined &&
    config.githubClientId !== "" &&
    config.githubClientSecret !== "";

  const sendEmail = createAuthMailer(config);
  const emailConfigured = Boolean(config.resendApiKey && config.emailFrom);
  return betterAuth({
    appName: "Filika",
    user: {
      additionalFields: {
        googleImage: { type: "string", required: false, input: false },
        useGoogleImage: { type: "boolean", defaultValue: false, input: false },
        githubImage: { type: "string", required: false, input: false },
        useGithubImage: { type: "boolean", defaultValue: false, input: false },
        theme: { type: "string", defaultValue: "light", input: false },
        density: { type: "string", defaultValue: "comfortable", input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendEmail({ to: user.email, url, kind: "reset" }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: ({ user, url }) => sendEmail({ to: user.email, url, kind: "verify" }),
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          !emailConfigured &&
          ["/sign-up/email", "/request-password-reset", "/send-verification-email"].includes(
            ctx.path,
          )
        ) {
          throw new APIError("SERVICE_UNAVAILABLE", {
            message: "Authentication email is not configured.",
          });
        }
      }),
    },
    // Do not expose email-provider latency or failures through account-existence timing.
    advanced: {
      backgroundTasks: {
        handler: (promise) => {
          const delivery = promise.catch(() => {
            console.error("Authentication email delivery failed.");
          });
          if (config.runInBackground) config.runInBackground(delivery);
          else void delivery;
        },
      },
    },
    rateLimit: {
      enabled: true,
      customRules: {
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
        "/sign-up/email": { window: 60, max: 5 },
        "/reset-password": { window: 60, max: 5 },
      },
    },
    baseURL: config.baseURL ?? "http://localhost:4173",
    secret: config.secret,
    trustedOrigins: [new URL(config.baseURL ?? "http://localhost:4173").origin],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders: {
      ...(hasGoogleCredentials
        ? {
            google: {
              overrideUserInfoOnSignIn: true,
              mapProfileToUser: (profile) => ({
                googleImage:
                  googlePhotoUrl((profile as { picture?: unknown }).picture) ??
                  googlePhotoUrl((profile as { image?: unknown }).image) ??
                  googlePhotoUrl((profile as { avatar_url?: unknown }).avatar_url),
                useGoogleImage: true,
              }),
              clientId: config.googleClientId as string,
              clientSecret: config.googleClientSecret as string,
            },
          }
        : {}),
      ...(hasGithubCredentials
        ? {
            github: {
              overrideUserInfoOnSignIn: true,
              mapProfileToUser: (profile) => ({
                githubImage:
                  githubPhotoUrl((profile as { avatar_url?: unknown }).avatar_url) ??
                  githubPhotoUrl((profile as { picture?: unknown }).picture) ??
                  githubPhotoUrl((profile as { image?: unknown }).image),
                useGithubImage: true,
              }),
              clientId: config.githubClientId as string,
              clientSecret: config.githubClientSecret as string,
            },
          }
        : {}),
    },
  });
}
