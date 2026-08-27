export function parseOriginHeader(header: string | null): string | null {
  if (header === null) {
    return null;
  }

  try {
    const url = new URL(header);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.username !== "" || url.password !== "") {
      return null;
    }

    if (url.pathname !== "/") {
      return null;
    }

    if (url.search !== "" || url.hash !== "") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export type OriginCheck = { origin: string; status: "accepted" } | { status: "rejected" };

export function checkOrigin(request: Request): OriginCheck {
  const origin = parseOriginHeader(request.headers.get("origin"));

  if (origin === null) {
    return { status: "rejected" };
  }

  return { origin, status: "accepted" };
}
