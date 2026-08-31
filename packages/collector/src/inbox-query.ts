import { INBOX_PAGE_SIZE_DEFAULT, type InboxListQuery } from "./inbox-contract";

export function parseListQuery(url: URL): InboxListQuery {
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit === null ? Number.NaN : Number.parseInt(rawLimit, 10);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : INBOX_PAGE_SIZE_DEFAULT;

  return {
    cursor: url.searchParams.get("cursor"),
    limit,
    search: (url.searchParams.get("search") ?? "").trim().slice(0, 200),
    ...parseKind(url.searchParams.get("kind")),
  };
}

function parseKind(kind: string | null): Pick<InboxListQuery, "kind"> {
  return kind === "bug" ||
    kind === "blocked_task" ||
    kind === "confusing_behavior" ||
    kind === "idea"
    ? { kind }
    : {};
}
