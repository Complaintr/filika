"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircleSlash,
  Inbox,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldCheck,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxListItemViewModel } from "@/contracts/inbox-view-model";
import { fetchComplaints } from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";
import { ComplaintDialog } from "@/workspace/complaint-dialog";
import { formatDate, kindLabels } from "@/workspace/dom";

interface ComplaintQuery {
  cursor: string | null;
  kind: string;
  search: string;
}

export default function ComplaintsPage() {
  const { reportConnection } = useConnection();
  const [query, setQuery] = useState<ComplaintQuery>({ cursor: null, kind: "", search: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
          if (controller.signal.aborted) return;
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
    const requestedKind = new URLSearchParams(window.location.search).get("kind") ?? "";
    const initial = {
      cursor: null,
      kind: Object.hasOwn(kindLabels, requestedKind) ? requestedKind : "",
      search: "",
    };
    setQuery(initial);
    load(initial);
    return () => {
      controllerRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  function reset(next: Partial<ComplaintQuery>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const merged: ComplaintQuery = {
      cursor: null,
      kind: next.kind ?? query.kind,
      search: next.search ?? query.search,
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
    const previousCursor = historyRef.current.pop() ?? null;
    setPage((value) => Math.max(1, value - 1));
    const next = { ...query, cursor: previousCursor };
    setQuery(next);
    load(next);
  }

  function goForward() {
    if (nextCursor === null) return;
    historyRef.current.push(query.cursor);
    setPage((value) => value + 1);
    const next = { ...query, cursor: nextCursor };
    setQuery(next);
    load(next);
  }

  const filtersActive = Boolean(query.search || query.kind);
  const selectedIndex = items?.findIndex((item) => item.feedbackId === selectedId) ?? -1;
  const closeReport = () => setSelectedId(null);

  return (
    <div className="feedback-workspace">
      <header className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">Feedback inbox</p>
          <h1>
            All complaints<span className="heading-dot">.</span>
          </h1>
          <p>The details that help you build something better.</p>
        </div>
        <button
          className="studio-button"
          type="button"
          onClick={() => load(query)}
          disabled={loading}
        >
          <RefreshCw className={loading ? "studio-spinning" : ""} /> Refresh
        </button>
      </header>
      <div className="feedback-tabs" aria-label="Feedback types">
        {[
          { key: "", label: "All feedback", icon: Inbox },
          { key: "bug", label: "Bugs", icon: Bug },
          { key: "blocked_task", label: "Blocked tasks", icon: CircleSlash },
          { key: "confusing_behavior", label: "Confusing behavior", icon: CircleHelp },
          { key: "idea", label: "Ideas", icon: Lightbulb },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={query.kind === key}
            onClick={() => reset({ kind: key, search: draft })}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
      <section className="feedback-surface" aria-label="Feedback list">
        <form
          className="feedback-tools"
          onSubmit={(event) => {
            event.preventDefault();
            reset({ search: draft });
          }}
        >
          <label className="feedback-search">
            <Search />
            <input
              aria-label="Search complaints, pages, or origins"
              type="search"
              maxLength={200}
              placeholder="Search feedback, pages, or origins…"
              value={draft}
              onChange={(event) => updateSearch(event.target.value)}
            />
            <kbd>↵</kbd>
          </label>
          <div className="feedback-tools-meta">
            <span>{loading ? "Updating…" : `${items?.length ?? 0} reports on this page`}</span>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  reset({ kind: "", search: "" });
                }}
              >
                <X /> Clear filters
              </button>
            )}
          </div>
        </form>
        <div aria-busy={loading} className={loading && items ? "feedback-updating" : ""}>
          {error ? (
            <div className="feedback-empty" role="alert">
              <span className="feedback-empty-icon">
                <WifiOff />
              </span>
              <h2>We couldn’t load your feedback</h2>
              <p>Your filters are saved. Check your connection and try again.</p>
              <button className="studio-button" type="button" onClick={() => load(query)}>
                Try again <ArrowRight />
              </button>
            </div>
          ) : loading && items === null ? (
            <div className="feedback-empty" role="status">
              <span className="feedback-empty-icon">
                <RefreshCw className="studio-spinning" />
              </span>
              <h2>Opening your inbox</h2>
              <p>Bringing your feedback into view.</p>
            </div>
          ) : !items?.length ? (
            <div className="feedback-empty" role="status">
              <span className="feedback-empty-icon">
                <Inbox />
              </span>
              <h2>{filtersActive ? "Nothing matches just yet" : "Good feedback starts here"}</h2>
              <p>
                {filtersActive
                  ? "Try a different phrase or clear your filters to see every report."
                  : "Once Filika is connected to your website, user-reviewed reports will arrive here."}
              </p>
              {filtersActive ? (
                <button
                  className="studio-button"
                  type="button"
                  onClick={() => {
                    setDraft("");
                    reset({ kind: "", search: "" });
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link href="/onboarding?edit=1" className="studio-button">
                  Your getting-started guide <ArrowRight />
                </Link>
              )}
            </div>
          ) : (
            <div className="feedback-table-scroll">
              <table className="feedback-table" aria-label="All complaints">
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Source</th>
                    <th scope="col">Received</th>
                    <th scope="col">
                      <span className="sr-only">Open report</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.feedbackId}>
                      <td>
                        <div className="feedback-report-cell">
                          <span className={`feedback-kind-icon feedback-type-${item.kind}`}>
                            <FeedbackIcon kind={item.kind} />
                          </span>
                          <div>
                            <button
                              className="feedback-title"
                              type="button"
                              onClick={() => setSelectedId(item.feedbackId)}
                            >
                              {item.title}
                            </button>
                            <span className="feedback-type-label">{kindLabels[item.kind]}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="feedback-source">
                          {item.routeLabel || "Unlabeled page"}
                        </span>
                        <span className="feedback-origin">{item.requestOrigin}</span>
                      </td>
                      <td>
                        <time
                          dateTime={item.receivedAt}
                          title={new Date(item.receivedAt).toLocaleString("en")}
                        >
                          {formatDate(item.receivedAt)}
                        </time>
                      </td>
                      <td>
                        <button
                          className="studio-icon-button feedback-open"
                          type="button"
                          aria-label={`Open ${item.title}`}
                          onClick={() => setSelectedId(item.feedbackId)}
                        >
                          <ArrowUpRight />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <footer className="feedback-pagination">
          <p role="status">
            Page <strong>{page}</strong> <span>·</span> Newest first
          </p>
          <div>
            <button
              className="studio-icon-button"
              type="button"
              aria-label="Previous page"
              disabled={page === 1 || loading}
              onClick={goBack}
            >
              <ChevronLeft />
            </button>
            <button
              className="studio-icon-button"
              type="button"
              aria-label="Next page"
              disabled={nextCursor === null || loading}
              onClick={goForward}
            >
              <ChevronRight />
            </button>
          </div>
        </footer>
      </section>
      <p className="feedback-footnote">
        <ShieldCheck /> Only the feedback people chose to share. No background page collection.
      </p>
      {selectedId && (
        <ComplaintDialog
          feedbackId={selectedId}
          onClose={closeReport}
          previousId={items?.[selectedIndex - 1]?.feedbackId}
          nextId={items?.[selectedIndex + 1]?.feedbackId}
          onNavigate={setSelectedId}
        />
      )}
    </div>
  );
}

function FeedbackIcon({ kind }: { kind: string }) {
  if (kind === "bug") return <Bug />;
  if (kind === "blocked_task") return <CircleSlash />;
  if (kind === "confusing_behavior") return <CircleHelp />;
  return <Lightbulb />;
}
