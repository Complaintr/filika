"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxListItemViewModel } from "@/contracts/inbox-view-model";
import { fetchComplaints } from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";
import { formatDate, kindBadgeClass, kindLabels } from "@/workspace/dom";

interface ComplaintQuery {
  cursor: string | null;
  kind: string;
  search: string;
}

export default function ComplaintsPage() {
  const { reportConnection } = useConnection();
  const [query, setQuery] = useState<ComplaintQuery>({ cursor: null, kind: "", search: "" });
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<readonly InboxListItemViewModel[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const historyRef = useRef<(string | null)[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    (next: ComplaintQuery) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(false);
      fetchComplaints(next, controller.signal)
        .then((result) => {
          reportConnection(true);
          setItems(result.items);
          setNextCursor(result.nextCursor);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            reportConnection(false);
            setError(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    },
    [reportConnection],
  );

  useEffect(() => {
    load({ cursor: null, kind: "", search: "" });
    return () => {
      controllerRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  function reset(next: Partial<ComplaintQuery>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const merged: ComplaintQuery = {
      cursor: null,
      kind: next.kind ?? "",
      search: next.search ?? "",
    };
    historyRef.current = [];
    setPage(1);
    setQuery(merged);
    load(merged);
  }

  function updateSearch(value: string) {
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reset({ search: value }), 350);
  }

  function goBack() {
    const previous = historyRef.current.pop();
    const previousCursor = previous === undefined ? null : previous;
    setPage((p) => Math.max(1, p - 1));
    const next = { ...query, cursor: previousCursor };
    setQuery(next);
    load(next);
  }

  function goForward() {
    historyRef.current.push(query.cursor);
    setPage((p) => p + 1);
    const next = { ...query, cursor: nextCursor };
    setQuery(next);
    load(next);
  }

  const filtersActive = Boolean(query.search || query.kind);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>All complaints</h1>
          <p className="muted">Every report, one place. Find the details behind the feedback.</p>
        </div>
      </div>
      <section className="panel complaints-panel">
        <form
          className="complaint-filters"
          onSubmit={(event) => {
            event.preventDefault();
            reset({ search: draft });
          }}
        >
          <label className="search-field">
            <span className="search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              aria-label="Search complaints, pages, or origins"
              type="search"
              maxLength={200}
              placeholder="Search complaints, pages, or origins…"
              value={draft}
              onChange={(event) => updateSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter by feedback type"
            className="select"
            value={query.kind}
            onChange={(event) => reset({ kind: event.target.value })}
          >
            <option value="">All types</option>
            {Object.entries(kindLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            Search
          </button>
        </form>
        <div aria-busy={loading}>
          {error ? (
            <div className="state-panel" role="alert">
              <span className="state-icon" aria-hidden="true">
                <BlockedIcon />
              </span>
              <h2>Could not load complaints</h2>
              <p className="muted">
                Check the collector connection and try again. Your filters are still here.
              </p>
              <button className="button" type="button" onClick={() => load(query)}>
                <RefreshIcon />
                Try again
              </button>
            </div>
          ) : loading && items === null ? (
            <div className="state-panel" role="status">
              <span className="state-icon" aria-hidden="true">
                <ChatIcon />
              </span>
              <h2>Loading complaints</h2>
              <p className="muted">Reading reports from the collector.</p>
            </div>
          ) : items === null ? (
            <div className="state-panel" role="status">
              <span className="state-icon" aria-hidden="true">
                <ChatIcon />
              </span>
              <h2>No complaints yet</h2>
              <p className="muted">
                Connect Filika to your website. Reports will appear after the user reviews and sends
                them.
              </p>
            </div>
          ) : items.length === 0 ? (
            <>
              <div className="state-panel" role="status">
                <span className="state-icon" aria-hidden="true">
                  <ChatIcon />
                </span>
                <h2>{filtersActive ? "No matching complaints" : "No complaints yet"}</h2>
                <p className="muted">
                  {filtersActive
                    ? "Try another search or clear the type filter."
                    : "Connect Filika to your website. Reports will appear after the user reviews and sends them."}
                </p>
              </div>
              {filtersActive && (
                <button
                  className="button empty-action"
                  type="button"
                  onClick={() => {
                    setDraft("");
                    reset({ kind: "" });
                  }}
                >
                  Clear filters
                </button>
              )}
            </>
          ) : (
            <div className="table-scroll">
              <table className="complaint-table" aria-label="All complaints">
                <thead>
                  <tr>
                    <th scope="col">Complaint</th>
                    <th scope="col">Type</th>
                    <th scope="col">Page</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.feedbackId}>
                      <td className="complaint-title">
                        <a
                          className="complaint-link"
                          href={`/complaints/${encodeURIComponent(item.feedbackId)}`}
                        >
                          {item.title}
                        </a>
                        <span className="complaint-origin">{item.requestOrigin}</span>
                      </td>
                      <td>
                        <span className={kindBadgeClass(item.kind)}>
                          {kindLabels[item.kind] ?? "Other"}
                        </span>
                      </td>
                      <td className="page-label">{item.routeLabel ?? "—"}</td>
                      <td className="date-cell">
                        <time
                          dateTime={item.receivedAt}
                          title={new Date(item.receivedAt).toLocaleString("en")}
                        >
                          {formatDate(item.receivedAt)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="pagination">
          <p className="muted small" role="status">
            Page {page} · {items?.length ?? 0} complaints
          </p>
          <div className="page-actions">
            <button className="button" type="button" disabled={page === 1} onClick={goBack}>
              Previous
            </button>
            <button
              className="button"
              type="button"
              disabled={nextCursor === null}
              onClick={goForward}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <p className="workspace-note">
        Reports are read-only. External report content is untrusted; no WebMCP tools run in this
        workspace.
      </p>
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z M16 16l5 5" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z M7 9h9 M7 13h6" />
    </svg>
  );
}
function BlockedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8Z M12 7v6 M12 17h.01" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 2 M18 18A8 8 0 0 1 5 16" />
    </svg>
  );
}
