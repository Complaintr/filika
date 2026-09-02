"use client";

import { Bug, CircleSlash2, Lightbulb, MessageSquareText, ShieldCheck, X } from "lucide-react";
import { useRef, useState } from "react";
import styles from "../../app/landing.module.css";

const stats = [
  ["Total feedback", "184", MessageSquareText],
  ["Bug reports", "72", Bug],
  ["Blocked tasks", "31", CircleSlash2],
  ["Ideas", "46", Lightbulb],
] as const;

const recentReports = [
  {
    kind: "Bug report",
    kindClass: styles.dashboardDemoKindBug,
    description:
      "After correcting an invalid card number, every payment field is cleared and the checkout step starts over.",
    expectedBehavior: "Only the invalid card number should be cleared so the payment can continue.",
    received: "Sep 2, 2026 at 09:42",
    route: "/checkout/payment",
    time: "2 min ago",
    title: "Payment form resets after validation",
  },
  {
    kind: "Blocked task",
    kindClass: styles.dashboardDemoKindBlocked,
    description:
      "The Continue button stays disabled after a valid teammate email is entered, so onboarding cannot be completed.",
    expectedBehavior: "A valid email should enable Continue and move the user to workspace setup.",
    received: "Sep 2, 2026 at 09:26",
    route: "/onboarding/team",
    time: "18 min ago",
    title: "Team invite step cannot be completed",
  },
  {
    kind: "Idea",
    kindClass: styles.dashboardDemoKindIdea,
    description:
      "Notification settings offer immediate delivery or no email, but there is no way to receive a daily digest.",
    expectedBehavior: "Let workspace members choose a daily or weekly notification digest.",
    received: "Sep 2, 2026 at 09:02",
    route: "/settings/notifications",
    time: "42 min ago",
    title: "Add a digest frequency option",
  },
] as const;

export function LandingDashboardDemo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const [activeReport, setActiveReport] = useState<(typeof recentReports)[number]>(
    recentReports[0],
  );

  const closeDialog = () => dialogRef.current?.close();
  const openReport = (report: (typeof recentReports)[number], invoker: HTMLButtonElement) => {
    setActiveReport(report);
    invokerRef.current = invoker;
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    queueMicrotask(() => closeButtonRef.current?.focus());
  };

  return (
    <section className={styles.dashboardDemo} aria-label="Filika dashboard preview">
      <header className={styles.dashboardDemoTopbar}>
        <div className={styles.dashboardDemoBrand}>
          <span className={styles.dashboardDemoBrandMark} aria-hidden="true">
            f
          </span>
          <strong>Filika</strong>
          <i aria-hidden="true" />
          <small>Acme Store</small>
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
              {recentReports.map((report) => (
                <button
                  key={report.title}
                  className={styles.dashboardDemoReportButton}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`View feedback: ${report.title}`}
                  onClick={(event) => openReport(report, event.currentTarget)}
                >
                  <span className={`${styles.dashboardDemoKind} ${report.kindClass}`}>
                    {report.kind}
                  </span>
                  <strong>{report.title}</strong>
                  <span className={styles.dashboardDemoReportMeta}>
                    <span className={styles.dashboardDemoReportRoute}>{report.route}</span>
                    <time>{report.time}</time>
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
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => invokerRef.current?.focus()}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
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
            <span className={`${styles.dashboardDemoKind} ${activeReport.kindClass}`}>
              {activeReport.kind}
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
