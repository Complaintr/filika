"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ComplaintPage,
  type DashboardData,
  fetchComplaints,
  fetchDashboard,
} from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";
import { formatDate, kindLabels } from "@/workspace/dom";

type RangeDays = 7 | 30 | 90;

function StatCard({
  label,
  value,
  note,
  symbol,
}: {
  label: string;
  note: string;
  symbol: string;
  value: number;
}) {
  return (
    <section className="stat-card">
      <div className="stat-label">
        <span>{label}</span>
        <span className="stat-icon" aria-hidden="true">
          {symbol}
        </span>
      </div>
      <div className="stat-value">
        <strong>{value.toLocaleString("en")}</strong>
        <span className="muted small">{note}</span>
      </div>
    </section>
  );
}

function DashboardChart({ data }: { data: DashboardData }) {
  const daily = new Map(data.daily.map((item) => [item.date, item.count]));
  const start = new Date(data.generatedAt);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - data.days + 1);
  const points = Array.from({ length: data.days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: daily.get(key) ?? 0 };
  });
  const maximum = Math.max(4, ...points.map((point) => point.count));
  const coordinates = points.map(
    (point, index) =>
      `${40 + (index * 710) / Math.max(1, points.length - 1)},${210 - (point.count / maximum) * 192}`,
  );
  const labels = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return (
    <div className="chart-container">
      <svg
        viewBox="0 0 760 240"
        role="img"
        aria-label={`${data.total} complaints over ${data.days} days. Daily values are available below the chart.`}
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const y = 18 + index * 48;
          return (
            <g key={index}>
              <line x1="40" x2="750" y1={y} y2={y} className="chart-grid" />
              <text x="28" y={y + 4} textAnchor="end" className="chart-label">
                {Math.round((maximum * (4 - index)) / 4)}
              </text>
            </g>
          );
        })}
        <polygon points={`40,210 ${coordinates.join(" ")} 750,210`} className="chart-area" />
        <polyline points={coordinates.join(" ")} className="chart-line" />
        {labels.map((index) => {
          const point = points[index];
          if (!point) return null;
          return (
            <text
              key={point.date}
              x={40 + (index * 710) / Math.max(1, points.length - 1)}
              y="235"
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              className="chart-label"
            >
              {new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(point.date))}
            </text>
          );
        })}
      </svg>
      {data.total === 0 && (
        <div className="chart-empty">
          <strong>A clearer picture starts with the first report.</strong>
          <span className="muted">Complaints received in this period will appear here.</span>
        </div>
      )}
      <details className="chart-data">
        <summary>View daily counts</summary>
        <table>
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th>Complaints</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function ComplaintTable({ items }: { items: ComplaintPage["items"] }) {
  return (
    <div className="table-scroll">
      <table className="complaint-table recent-table" aria-label="Latest complaints">
        <thead>
          <tr>
            <th scope="col">Complaint</th>
            <th scope="col">Type</th>
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
                <span className={`kind-badge kind-${item.kind}`}>
                  {kindLabels[item.kind] ?? "Other"}
                </span>
              </td>
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
  );
}

export default function DashboardPage() {
  const { reportConnection } = useConnection();
  const [days, setDays] = useState<RangeDays>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<ComplaintPage["items"] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(
    (range: RangeDays) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(false);
      setRecent(null);
      fetchDashboard(range, controller.signal)
        .then((next) => {
          reportConnection(true);
          setData(next);
          return fetchComplaints({ search: "", kind: "", cursor: null }, controller.signal).then(
            (page) => setRecent(page.items.slice(0, 5)),
          );
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
    load(days);
    return () => controllerRef.current?.abort();
  }, [days, load]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Dashboard</h1>
          <p className="muted">A little clarity on what needs your attention.</p>
        </div>
        <div className="page-actions">
          <div className="select-with-icon">
            <span className="select-icon" aria-hidden="true">
              <CalendarIcon />
            </span>
            <select
              aria-label="Dashboard date range"
              className="select"
              value={days}
              onChange={(event) => setDays(Number(event.target.value) as RangeDays)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <a className="button button-primary" href="/complaints">
            View complaints
          </a>
        </div>
      </div>
      <div className="dashboard-body" aria-busy={loading}>
        {error ? (
          <DashboardError onRetry={() => load(days)} />
        ) : data === null ? (
          <StatePanel
            title="Loading your dashboard"
            body="Reading complaint activity from the collector."
          />
        ) : (
          <>
            <div className="stats-grid">
              <StatCard
                label="Total complaints"
                value={data.total}
                note="Across all feedback types"
                symbol="complaints"
              />
              <StatCard
                label="Bug reports"
                value={data.kinds.find((item) => item.kind === "bug")?.count ?? 0}
                note="Things that need a fix"
                symbol="bug"
              />
              <StatCard
                label="Blocked tasks"
                value={data.kinds.find((item) => item.kind === "blocked_task")?.count ?? 0}
                note="Journeys that could not finish"
                symbol="blocked"
              />
              <StatCard
                label="Ideas"
                value={data.kinds.find((item) => item.kind === "idea")?.count ?? 0}
                note="Room for something better"
                symbol="idea"
              />
            </div>
            <div className="dashboard-grid">
              <div className="panel activity-panel">
                <div className="panel-heading">
                  <h2>Complaint activity</h2>
                  <span className="muted small">Daily volume · UTC · {days} days</span>
                </div>
                <DashboardChart data={data} />
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <h2>By feedback type</h2>
                  <span className="muted small">What people report</span>
                </div>
                <div className="breakdown">
                  {Object.entries(kindLabels).map(([kind, label]) => {
                    const count = data.kinds.find((item) => item.kind === kind)?.count ?? 0;
                    return (
                      <a key={kind} className="breakdown-row" href={`/complaints?kind=${kind}`}>
                        <div className="breakdown-label">
                          <span>{label}</span>
                          <strong className="mono">{count}</strong>
                        </div>
                        <div className="bar-track">
                          <span
                            className={`bar-fill kind-${kind}`}
                            style={{ width: `${data.total ? (count / data.total) * 100 : 0}%` }}
                          />
                        </div>
                      </a>
                    );
                  })}
                </div>
                <p className="panel-note">Every report starts with the user&apos;s review.</p>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <h2>Latest complaints</h2>
                  <span className="muted small">Most recently received · all dates</span>
                </div>
                {recent === null ? (
                  <StatePanel
                    title="Loading recent reports"
                    body="Fetching the latest complaints."
                  />
                ) : recent.length === 0 ? (
                  <StatePanel
                    title="No complaints yet"
                    body="User-reviewed reports from your website will arrive here."
                  />
                ) : (
                  <>
                    <ComplaintTable items={recent} />
                    <a className="panel-link" href="/complaints">
                      View all complaints →
                    </a>
                  </>
                )}
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <h2>Most reported pages</h2>
                  <span className="muted small">Top 5 in this period</span>
                </div>
                {data.routes.length === 0 ? (
                  <StatePanel
                    title="No pages yet"
                    body="Page labels will appear when reports include them."
                  />
                ) : (
                  <ol className="route-list">
                    {data.routes.map((route, index) => (
                      <li key={route.label ?? `unlabeled-${route.count}`}>
                        <span className="route-rank mono">{index + 1}</span>
                        <span className="route-name">{route.label ?? "No page label"}</span>
                        <strong className="mono">{route.count}</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
            <div className="dashboard-footer">
              <span>
                Updated {data ? formatDate(data.generatedAt) : ""} · Counts include retained records
                in this period.
              </span>
              <a className="text-link" href="/settings">
                Workspace settings
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function StatePanel({ body, title }: { body: string; title: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="state-icon" aria-hidden="true">
        <ChatIcon />
      </span>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <div className="state-panel" role="alert">
        <span className="state-icon" aria-hidden="true">
          <BlockedIcon />
        </span>
        <h2>Could not load your dashboard</h2>
        <p className="muted">Check that the collector and database are running, then try again.</p>
        <button className="button" type="button" onClick={onRetry}>
          <RefreshIcon />
          Try again
        </button>
      </div>
      <a className="panel-link" href="/settings">
        Connection details
      </a>
    </>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M7 3v4 M17 3v4 M3 11h18" />
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
