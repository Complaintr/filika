import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db/client";
import { account, user } from "./db/schema";
import { githubPhotoUrl, googlePhotoUrl } from "./photo-url";

export { githubPhotoUrl, googlePhotoUrl };

export const accountSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    theme: z.enum(["light", "dark", "system"]),
    density: z.enum(["comfortable", "compact"]),
    useGoogleImage: z.boolean(),
    useGithubImage: z.boolean(),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export async function getAccountProfile(db: Db, userId: string) {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const google = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);
  const github = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .limit(1);
  const googlePhoto = google.length
    ? (googlePhotoUrl(row.googleImage) ?? googlePhotoUrl(row.image))
    : null;
  const githubPhoto = github.length
    ? (githubPhotoUrl(row.githubImage) ?? githubPhotoUrl(row.image))
    : null;

  let image: string | null = null;
  if (row.useGoogleImage && googlePhoto) {
    image = googlePhoto;
  } else if (row.useGithubImage && githubPhoto) {
    image = githubPhoto;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image,
    googleConnected: google.length > 0,
    googleImageAvailable: googlePhoto !== null,
    useGoogleImage: row.useGoogleImage,
    githubConnected: github.length > 0,
    githubImageAvailable: githubPhoto !== null,
    useGithubImage: row.useGithubImage,
    theme: row.theme === "dark" || row.theme === "system" ? row.theme : "light",
    density: row.density === "compact" ? "compact" : "comfortable",
  };
}
