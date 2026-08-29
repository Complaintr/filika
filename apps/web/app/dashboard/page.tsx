"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type DashboardData, fetchDashboard } from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";
import { formatDate, kindLabels } from "@/workspace/dom";

type RangeDays = 7 | 30 | 90;

function StatCard({ label, value, note }: { label: string; note: string; value: number }) {
  return (
    <section className="stat-card">
      <div className="stat-label">
        <span>{label}</span>
        <span className="stat-info" title={note} aria-hidden="true">
          i
        </span>
        <span className="sr-only">{note}</span>
      </div>
      <div className="stat-value">
        <strong>{value.toLocaleString("en")}</strong>
      </div>
    </section>
  );
}

function DashboardChart({ data }: { data: DashboardData }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: 42 + (index * 776) / Math.max(1, points.length - 1),
    y: 232 - (point.count / maximum) * 172,
  }));
  const path = chartPoints.reduce((result, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = chartPoints[index - 1];
    if (!previous) return result;
    const middle = (previous.x + point.x) / 2;
    return `${result} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const labelIndexes = Array.from(
    new Set([
      0,
      Math.floor((points.length - 1) / 3),
      Math.floor(((points.length - 1) * 2) / 3),
      points.length - 1,
    ]),
  );
  const activePoint = activeIndex === null ? null : chartPoints[activeIndex];
  const dateFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="chart-container">
      <svg
        viewBox="0 0 860 290"
        role="img"
        aria-label={`${data.total} complaints over ${data.days} days.`}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 860;
          const index = Math.round(((x - 42) / 776) * Math.max(1, points.length - 1));
          setActiveIndex(Math.max(0, Math.min(points.length - 1, index)));
        }}
      >
        <defs>
          <pattern id="dashboard-dot-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="chart-grid-dot" />
          </pattern>
          <linearGradient id="dashboard-line-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#2f73f6" stopOpacity="0.18" />
            <stop offset="0.16" stopColor="#2f73f6" stopOpacity="0.62" />
            <stop offset="0.84" stopColor="#2f73f6" stopOpacity="0.86" />
            <stop offset="1" stopColor="#2f73f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x="22" y="24" width="816" height="220" fill="url(#dashboard-dot-grid)" />
        <path d={path} className="chart-line" />
        {labelIndexes.map((index) => {
          const point = chartPoints[index];
          if (!point) return null;
          return (
            <text
              key={point.date}
              x={point.x}
              y="270"
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              className="chart-label"
            >
              {dateFormatter.format(new Date(point.date))}
            </text>
          );
        })}
        {activePoint && (
          <g className="chart-focus">
            <line x1={activePoint.x} x2={activePoint.x} y1="34" y2="244" />
            <circle cx={activePoint.x} cy={activePoint.y} r="5" />
            <rect x={activePoint.x - 38} y="250" width="76" height="30" rx="15" />
            <text x={activePoint.x} y="270" textAnchor="middle">
              {dateFormatter.format(new Date(activePoint.date))}
            </text>
          </g>
        )}
      </svg>
      {activePoint && (
        <div
          className="chart-tooltip"
          style={{ left: `${(activePoint.x / 860) * 100}%` }}
          role="status"
        >
          <strong>{dateFormatter.format(new Date(activePoint.date))}</strong>
          <span>
            <i aria-hidden="true" /> Complaints <b>{activePoint.count.toLocaleString("en")}</b>
          </span>
        </div>
      )}
      {data.total === 0 && (
        <div className="chart-empty">
          <strong>A clearer picture starts with the first report.</strong>
          <span className="muted">Complaints received in this period will appear here.</span>
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>Daily complaint counts</caption>
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
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { reportConnection } = useConnection();
  const [days, setDays] = useState<RangeDays>(30);
  const [data, setData] = useState<DashboardData | null>(null);
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
      fetchDashboard(range, controller.signal)
        .then((next) => {
          reportConnection(true);
          setData(next);
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
        <div className="page-actions dashboard-actions">
          <div className="date-range-control">
            <select
              aria-label="Dashboard date range"
              className="date-range-select"
              value={days}
              onChange={(event) => setDays(Number(event.target.value) as RangeDays)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <span className="date-range-menu" aria-hidden="true">
              <KebabIcon />
            </span>
          </div>
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
              />
              <StatCard
                label="Bug reports"
                value={data.kinds.find((item) => item.kind === "bug")?.count ?? 0}
                note="Things that need a fix"
              />
              <StatCard
                label="Blocked tasks"
                value={data.kinds.find((item) => item.kind === "blocked_task")?.count ?? 0}
                note="Journeys that could not finish"
              />
              <StatCard
                label="Ideas"
                value={data.kinds.find((item) => item.kind === "idea")?.count ?? 0}
                note="Room for something better"
              />
            </div>
            <div className="dashboard-grid">
              <section
                className="analytics-surface activity-panel"
                aria-labelledby="activity-title"
              >
                <div className="sr-only">
                  <h2 id="activity-title">Complaint activity</h2>
                  <span>Daily volume · UTC · {days} days</span>
                </div>
                <div className="analytics-inset chart-inset">
                  <DashboardChart data={data} />
                </div>
              </section>
              <section className="analytics-surface feedback-type-panel">
                <div className="analytics-surface-heading">
                  <h2>By feedback type</h2>
                  <span>Share of reports</span>
                </div>
                <div className="analytics-inset breakdown">
                  {Object.entries(kindLabels).map(([kind, label]) => {
                    const count = data.kinds.find((item) => item.kind === kind)?.count ?? 0;
                    const percentage = data.total ? Math.round((count / data.total) * 100) : 0;
                    return (
                      <a key={kind} className="breakdown-row" href={`/complaints?kind=${kind}`}>
                        <span className={`breakdown-dot kind-${kind}`} aria-hidden="true" />
                        <span className="breakdown-name">{label}</span>
                        <strong className="mono">{count}</strong>
                        <span className="mono breakdown-percentage">{percentage}%</span>
                      </a>
                    );
                  })}
                </div>
              </section>
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

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
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
