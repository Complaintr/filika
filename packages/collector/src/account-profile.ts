import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db/client";
import { account, user } from "./db/schema";

/** Accept only Google's HTTPS photo hosts, never a user-provided remote URL. */
export function googlePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export const accountSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    theme: z.enum(["light", "dark", "system"]),
    density: z.enum(["comfortable", "compact"]),
    useGoogleImage: z.boolean(),
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
  const photo = google.length ? googlePhotoUrl(row.googleImage) : null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.useGoogleImage ? photo : null,
    googleConnected: google.length > 0,
    googleImageAvailable: photo !== null,
    useGoogleImage: row.useGoogleImage,
    theme: row.theme === "dark" || row.theme === "system" ? row.theme : "light",
    density: row.density === "compact" ? "compact" : "comfortable",
  };
}
