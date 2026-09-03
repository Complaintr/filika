/** Google's profile-photo CDN host families, excluding the default avatar hosts. */
export const GOOGLE_PHOTO_HOST_SUFFIXES = [
  "googleusercontent.com",
  "ggpht.com",
  "gstatic.com",
] as const;

/** GitHub's profile-photo CDN host families. */
export const GITHUB_PHOTO_HOST_SUFFIXES = ["githubusercontent.com"] as const;

/** Accept only Google's HTTPS photo CDN hosts, never a user-provided remote URL. */
export function googlePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== ""
    ) {
      return null;
    }

    const onCdn = GOOGLE_PHOTO_HOST_SUFFIXES.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
    );

    return onCdn ? url.href : null;
  } catch {
    return null;
  }
}

/** Accept only GitHub's HTTPS photo CDN hosts, never a user-provided remote URL. */
export function githubPhotoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== ""
    ) {
      return null;
    }

    const onCdn = GITHUB_PHOTO_HOST_SUFFIXES.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
    );

    return onCdn ? url.href : null;
  } catch {
    return null;
  }
}
