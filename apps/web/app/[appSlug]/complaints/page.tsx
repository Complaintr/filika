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
import { useApplication } from "@/applications/application-context";
import type { InboxListItemViewModel } from "@/contracts/inbox-view-model";
import { fetchComplaints } from "@/services/workspace-api";
import { ComplaintDialog } from "@/workspace/complaint-dialog";
import { useConnection } from "@/workspace/connection";
import { formatDate, kindLabels } from "@/workspace/dom";

interface ComplaintQuery {
  cursor: string | null;
  kind: string;
  search: string;
}

export default function ComplaintsPage() {
  const { reportConnection } = useConnection();
  const { application } = useApplication();
  const slug = application?.slug ?? "";
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
      fetchComplaints(next, controller.signal, slug)
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
    [reportConnection, slug],
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
      <header className="page-heading">
        <div>
          <h1>All complaints</h1>
          <p className="muted">A closer look at the feedback behind your product.</p>
        </div>
        <button
          className="button filika-pill"
          type="button"
          onClick={() => load(query)}
          disabled={loading}
        >
          <RefreshCw className={loading ? "studio-spinning" : ""} /> Refresh inbox
        </button>
      </header>
      <section className="analytics-surface feedback-inbox" aria-label="Feedback inbox">
        <div className="analytics-surface-heading">
          <h2>Your inbox</h2>
          <span>{loading ? "Updating…" : `${items?.length ?? 0} reports on this page`}</span>
        </div>
        <div className="analytics-inset feedback-inbox-inset">
          <form
            className="feedback-inbox-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              reset({ search: draft });
            }}
          >
            <label className="feedback-inbox-search">
              <Search />
              <input
                aria-label="Search complaints, pages, or origins"
                type="search"
                maxLength={200}
                placeholder="Search complaints…"
                value={draft}
                onChange={(event) => updateSearch(event.target.value)}
              />
            </label>
            <span className="feedback-sort-label">Newest first</span>
            {filtersActive && (
              <button
                className="button filika-pill"
                type="button"
                onClick={() => {
                  setDraft("");
                  reset({ kind: "", search: "" });
                }}
              >
                <X /> Clear
              </button>
            )}
          </form>
          <fieldset className="feedback-kind-switcher" aria-label="Feedback types">
            {[
              { key: "", label: "All complaints", icon: Inbox },
              { key: "bug", label: "Bugs", icon: Bug },
              { key: "blocked_task", label: "Blocked tasks", icon: CircleSlash },
              { key: "confusing_behavior", label: "Confusing", icon: CircleHelp },
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
          </fieldset>
          <div
            className={`feedback-inbox-body${loading && items ? " feedback-updating" : ""}`}
            aria-busy={loading}
          >
            {error ? (
              <div className="feedback-empty" role="alert">
                <span className="feedback-empty-icon">
                  <WifiOff />
                </span>
                <h2>Could not load complaints</h2>
                <p>Check the collector connection and try again. Your filters are still here.</p>
                <button className="button filika-pill" type="button" onClick={() => load(query)}>
                  Try again <ArrowRight />
                </button>
              </div>
            ) : loading && items === null ? (
              <div className="feedback-empty" role="status">
                <span className="feedback-empty-icon">
                  <RefreshCw className="studio-spinning" />
                </span>
                <h2>Loading your inbox</h2>
                <p>Reading reports from the collector.</p>
              </div>
            ) : !items?.length ? (
              <div className="feedback-empty" role="status">
                <span className="feedback-empty-icon">
                  <Inbox />
                </span>
                <h2>
                  {filtersActive ? "No matching complaints" : "Your next improvement starts here."}
                </h2>
                <p>
                  {filtersActive
                    ? "Try another search or clear your filters."
                    : "Once someone sends feedback from your website, you’ll find it here."}
                </p>
                {filtersActive ? (
                  <button
                    className="button filika-pill"
                    type="button"
                    onClick={() => {
                      setDraft("");
                      reset({ kind: "", search: "" });
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link
                    href={`/onboarding?app=${encodeURIComponent(slug)}`}
                    className="button filika-pill"
                  >
                    Set up your feedback flow <ArrowRight />
                  </Link>
                )}
              </div>
            ) : (
              <ol className="feedback-report-list" aria-label="Complaints">
                {items.map((item) => (
                  <li key={item.feedbackId}>
                    <button
                      className="feedback-report-button"
                      type="button"
                      onClick={() => setSelectedId(item.feedbackId)}
                    >
                      <span className={`feedback-report-symbol feedback-type-${item.kind}`}>
                        <FeedbackIcon kind={item.kind} />
                      </span>
                      <span className="feedback-report-copy">
                        <strong>{item.title}</strong>
                        <span className="feedback-report-metadata">
                          <span>{kindLabels[item.kind]}</span>
                          <i aria-hidden="true">·</i>
                          <span>{item.routeLabel || item.requestOrigin}</span>
                          {item.routeLabel && (
                            <>
                              <i aria-hidden="true">·</i>
                              <span className="feedback-report-origin">{item.requestOrigin}</span>
                            </>
                          )}
                        </span>
                      </span>
                      <time
                        dateTime={item.receivedAt}
                        title={new Date(item.receivedAt).toLocaleString("en")}
                      >
                        {formatDate(item.receivedAt)}
                      </time>
                      <ArrowUpRight className="feedback-report-arrow" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <footer className="feedback-inbox-footer">
            <p role="status">Page {page}</p>
            <div>
              <button
                className="button filika-pill"
                type="button"
                disabled={page === 1 || loading}
                onClick={goBack}
              >
                <ChevronLeft /> Previous
              </button>
              <button
                className="button filika-pill"
                type="button"
                disabled={nextCursor === null || loading}
                onClick={goForward}
              >
                Next <ChevronRight />
              </button>
            </div>
          </footer>
        </div>
      </section>
      <p className="feedback-footnote">
        <ShieldCheck /> Reviewed by people. Shared on their terms.
      </p>
      {selectedId && (
        <ComplaintDialog
          appSlug={slug}
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
