"use client";

import { Bug, CircleSlash2, Lightbulb, MessageSquareText, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import styles from "../../app/landing.module.css";
import {
  LANDING_DEMO_REPORTS,
  type LandingDemoFeedbackKind,
  type LandingDemoReport,
  landingDemoCategory,
} from "./landing-workspace-demo-data";

const stats = [
  ["Total feedback", "184", MessageSquareText],
  ["Bug reports", "72", Bug],
  ["Blocked tasks", "31", CircleSlash2],
  ["Ideas", "46", Lightbulb],
] as const;

function landingDemoKindClass(kind: LandingDemoFeedbackKind): string | undefined {
  if (kind === "bug") return styles.dashboardDemoKindBug;
  if (kind === "blocked_task") return styles.dashboardDemoKindBlocked;
  if (kind === "confusing_behavior") return styles.dashboardDemoKindConfusing;
  return styles.dashboardDemoKindIdea;
}

export function LandingDashboardDemo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const [activeReport, setActiveReport] = useState<LandingDemoReport>(LANDING_DEMO_REPORTS[0]);

  const closeDialog = () => dialogRef.current?.close();
  const openReport = (report: LandingDemoReport, invoker: HTMLButtonElement) => {
    setActiveReport(report);
    invokerRef.current = invoker;
    if (!dialogRef.current?.open) dialogRef.current?.show();
    queueMicrotask(() => closeButtonRef.current?.focus());
  };

  return (
    <section className={styles.dashboardDemo} aria-label="Filika dashboard preview">
      <header className={styles.dashboardDemoTopbar}>
        <div className={styles.dashboardDemoBrand}>
          <Image
            className={styles.dashboardDemoBrandMark}
            src="/filika-logo.svg"
            width={24}
            height={24}
            alt=""
            unoptimized
          />
          <strong>Filika</strong>
          <i aria-hidden="true" />
          <small>Filika Demo</small>
        </div>
        <span className={styles.dashboardDemoStatus}>
          <i aria-hidden="true" /> Collector connected
        </span>
      </header>

      <div className={styles.dashboardDemoBody}>
        <div className={styles.dashboardDemoHeading}>
          <div>
            <span className={styles.dashboardDemoMutedLabel}>Workspace overview</span>
            <h2>Dashboard</h2>
          </div>
          <span className={styles.dashboardDemoRange}>Last 30 days</span>
        </div>

        <div className={styles.dashboardDemoStats}>
          {stats.map(([label, value, Icon]) => (
            <article key={label}>
              <span>
                <Icon aria-hidden="true" data-free-size="true" /> {label}
              </span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className={styles.dashboardDemoGrid}>
          <section className={styles.dashboardDemoChart} aria-labelledby="landing-chart-title">
            <div className={styles.dashboardDemoPanelHeading}>
              <div>
                <h3 id="landing-chart-title">Feedback activity</h3>
                <span className={styles.dashboardDemoMutedLabel}>Reports received</span>
              </div>
              <strong>+18.2%</strong>
            </div>
            <svg
              viewBox="0 0 560 190"
              preserveAspectRatio="none"
              data-free-size="true"
              role="img"
              aria-label="Feedback activity increased over the last 30 days"
            >
              <defs>
                <pattern
                  id="landing-dashboard-grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" />
                </pattern>
                <linearGradient id="landing-dashboard-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#009fe3" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#009fe3" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="560" height="190" fill="url(#landing-dashboard-grid)" />
              <path
                className={styles.dashboardDemoChartArea}
                d="M0 164 C45 154 64 121 108 130 S174 145 214 108 S276 89 316 104 S379 83 416 58 S486 79 560 28 L560 190 L0 190 Z"
              />
              <path
                className={styles.dashboardDemoChartLine}
                d="M0 164 C45 154 64 121 108 130 S174 145 214 108 S276 89 316 104 S379 83 416 58 S486 79 560 28"
              />
              <circle className={styles.dashboardDemoChartPoint} cx="416" cy="58" r="5" />
            </svg>
            <div className={styles.dashboardDemoChartLabels} aria-hidden="true">
              <span>Aug 04</span>
              <span>Aug 14</span>
              <span>Aug 24</span>
              <span>Sep 02</span>
            </div>
          </section>

          <section className={styles.dashboardDemoRecent} aria-labelledby="landing-recent-title">
            <div className={styles.dashboardDemoPanelHeading}>
              <div>
                <h3 id="landing-recent-title">Recent feedback</h3>
                <span className={styles.dashboardDemoMutedLabel}>Needs your attention</span>
              </div>
              <span className={styles.dashboardDemoPrivate}>
                <ShieldCheck aria-hidden="true" data-free-size="true" /> Private
              </span>
            </div>
            <div className={styles.dashboardDemoReportList}>
              {LANDING_DEMO_REPORTS.map((report) => (
                <button
                  key={report.title}
                  className={styles.dashboardDemoReportButton}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`View feedback: ${report.title}`}
                  onClick={(event) => openReport(report, event.currentTarget)}
                >
                  <span
                    className={`${styles.dashboardDemoKind} ${landingDemoKindClass(report.kind)}`}
                  >
                    {landingDemoCategory(report.kind).label}
                  </span>
                  <strong>{report.title}</strong>
                  <span className={styles.dashboardDemoReportMeta}>
                    <span className={styles.dashboardDemoReportRoute}>{report.route}</span>
                    <time>{report.relativeTime}</time>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dashboardDemoDialog}
        aria-labelledby="landing-feedback-detail-title"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => invokerRef.current?.focus()}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeDialog();
          }
          if (event.key === "Tab") {
            event.preventDefault();
            closeButtonRef.current?.focus();
          }
        }}
      >
        <div className={styles.dashboardDemoDialogCard}>
          <header className={styles.dashboardDemoDialogToolbar}>
            <span className={styles.dashboardDemoDialogLabel}>Feedback details</span>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close feedback details"
              onClick={closeDialog}
            >
              <X aria-hidden="true" data-free-size="true" />
            </button>
          </header>
          <div className={styles.dashboardDemoDialogContent}>
            <span
              className={`${styles.dashboardDemoKind} ${landingDemoKindClass(activeReport.kind)}`}
            >
              {landingDemoCategory(activeReport.kind).label}
            </span>
            <h2 id="landing-feedback-detail-title">{activeReport.title}</h2>
            <p className={styles.dashboardDemoDialogReceived}>
              Received {activeReport.received} · {activeReport.route}
            </p>
            <div className={styles.dashboardDemoDialogGrid}>
              <div>
                <section>
                  <h3>What happened</h3>
                  <p>{activeReport.description}</p>
                </section>
                <section>
                  <h3>What was expected</h3>
                  <p>{activeReport.expectedBehavior}</p>
                </section>
              </div>
              <aside>
                <h3>Report context</h3>
                <dl>
                  <div>
                    <dt>Application</dt>
                    <dd>Acme Store</dd>
                  </div>
                  <div>
                    <dt>Page</dt>
                    <dd>{activeReport.route}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>WebMCP agent</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
          <footer className={styles.dashboardDemoDialogFooter}>
            <ShieldCheck aria-hidden="true" data-free-size="true" />
            Read-only preview. No data is sent.
          </footer>
        </div>
      </dialog>
    </section>
  );
}
