"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  CircleHelp,
  CircleSlash2,
  Inbox,
  Lightbulb,
  type LucideIcon,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import styles from "../../app/landing.module.css";
import {
  LANDING_DEMO_CATEGORIES,
  LANDING_DEMO_REPORTS,
  type LandingDemoFeedbackKind,
  type LandingDemoReport,
  landingDemoCategory,
} from "./landing-workspace-demo-data";

const stats = [
  ["Total complaints", "60", MessageSquareText],
  ["Bug reports", "15", Bug],
  ["Blocked tasks", "15", CircleSlash2],
  ["Ideas", "15", Lightbulb],
] as const;

const landingDemoKindIcons: Record<LandingDemoFeedbackKind, LucideIcon> = {
  blocked_task: CircleSlash2,
  bug: Bug,
  confusing_behavior: CircleHelp,
  idea: Lightbulb,
};

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
  const categoryButtonsRef = useRef<Partial<Record<LandingDemoFeedbackKind, HTMLButtonElement>>>(
    {},
  );
  const lastCategoryKindRef = useRef<LandingDemoFeedbackKind | null>(null);
  const complaintsHeadingRef = useRef<HTMLHeadingElement>(null);
  const [activeReport, setActiveReport] = useState<LandingDemoReport>(LANDING_DEMO_REPORTS[0]);
  const [activeKind, setActiveKind] = useState<LandingDemoFeedbackKind | null>(null);
  const [view, setView] = useState<"complaints" | "dashboard">("dashboard");

  const visibleReports =
    activeKind === null
      ? LANDING_DEMO_REPORTS
      : LANDING_DEMO_REPORTS.filter((report) => report.kind === activeKind);

  useEffect(() => {
    if (view === "complaints") {
      complaintsHeadingRef.current?.focus();
    } else if (lastCategoryKindRef.current) {
      categoryButtonsRef.current[lastCategoryKindRef.current]?.focus();
    }
  }, [view]);

  const closeDialog = () => dialogRef.current?.close();
  const openReport = (report: LandingDemoReport, invoker: HTMLButtonElement) => {
    setActiveReport(report);
    invokerRef.current = invoker;
    if (!dialogRef.current?.open) dialogRef.current?.show();
    queueMicrotask(() => closeButtonRef.current?.focus());
  };
  const openComplaints = (kind: LandingDemoFeedbackKind) => {
    lastCategoryKindRef.current = kind;
    setActiveKind(kind);
    setView("complaints");
  };

  return (
    <section className={styles.dashboardDemo} aria-label="Filika dashboard preview">
      <header className={styles.dashboardDemoTopbar}>
        <div className={styles.dashboardDemoBrand}>
          <FilikaBrand href="/" label="Filika home" />
          <i aria-hidden="true" />
          <small>Filika Demo</small>
        </div>
      </header>

      <div className={styles.dashboardDemoBody}>
        {view === "dashboard" ? (
          <div className={styles.dashboardDemoView} data-demo-view="dashboard">
            <div className={styles.dashboardDemoHeading}>
              <div>
                <h2>Dashboard</h2>
                <p>A little clarity on what needs your attention.</p>
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
                <div className={styles.dashboardDemoChartTitle}>
                  <h3 id="landing-chart-title">Complaint activity</h3>
                  <span>Daily volume · UTC · 30 days</span>
                </div>
                <svg
                  viewBox="0 0 560 190"
                  preserveAspectRatio="none"
                  data-free-size="true"
                  role="img"
                  aria-label="60 complaints over the last 30 days"
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
                  </defs>
                  <rect width="560" height="190" fill="url(#landing-dashboard-grid)" />
                  <path
                    className={styles.dashboardDemoChartLine}
                    d="M18 126 C30 112 42 138 56 120 S82 96 98 114 S126 145 144 118 S170 82 188 104 S218 132 236 94 S266 116 284 88 S312 72 330 100 S356 126 374 90 S402 108 420 70 S448 92 466 62 S498 78 542 44"
                  />
                </svg>
                <div className={styles.dashboardDemoChartLabels} aria-hidden="true">
                  <span>Aug 04</span>
                  <span>Aug 14</span>
                  <span>Aug 24</span>
                  <span>Sep 02</span>
                </div>
              </section>

              <section
                className={styles.dashboardDemoBreakdown}
                aria-labelledby="landing-breakdown-title"
              >
                <div className={styles.dashboardDemoPanelHeading}>
                  <h3 id="landing-breakdown-title">By feedback type</h3>
                  <span>Share of reports</span>
                </div>
                <div className={styles.dashboardDemoBreakdownList}>
                  {LANDING_DEMO_CATEGORIES.map((category) => (
                    <button
                      key={category.kind}
                      ref={(node) => {
                        if (node) categoryButtonsRef.current[category.kind] = node;
                      }}
                      className={styles.dashboardDemoBreakdownRow}
                      type="button"
                      aria-label={`View ${category.label} complaints`}
                      onClick={() => openComplaints(category.kind)}
                    >
                      <span
                        className={`${styles.dashboardDemoBreakdownDot} ${landingDemoKindClass(category.kind)}`}
                        aria-hidden="true"
                      />
                      <span>{category.label}</span>
                      <strong>{category.count}</strong>
                      <span>{category.percentage}%</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className={styles.dashboardDemoComplaints} data-demo-view="complaints">
            <div className={styles.dashboardDemoComplaintsHeading}>
              <button
                className={styles.dashboardDemoBack}
                type="button"
                onClick={() => setView("dashboard")}
              >
                <ArrowLeft aria-hidden="true" data-free-size="true" /> Back to dashboard
              </button>
              <div>
                <h2 ref={complaintsHeadingRef} tabIndex={-1}>
                  All complaints
                </h2>
                <p>A closer look at the feedback behind your product.</p>
              </div>
            </div>

            <section className={styles.dashboardDemoInbox} aria-label="Demo feedback inbox">
              <div className={styles.dashboardDemoPanelHeading}>
                <h3>Your inbox</h3>
                <span>{visibleReports.length} reports on this page</span>
              </div>
              <div className={styles.dashboardDemoInboxInset}>
                <fieldset className={styles.dashboardDemoFilters} aria-label="Feedback types">
                  <button
                    type="button"
                    aria-pressed={activeKind === null}
                    onClick={() => setActiveKind(null)}
                  >
                    <Inbox aria-hidden="true" data-free-size="true" /> All complaints
                  </button>
                  {LANDING_DEMO_CATEGORIES.map((category) => {
                    const Icon = landingDemoKindIcons[category.kind];
                    return (
                      <button
                        key={category.kind}
                        type="button"
                        aria-pressed={activeKind === category.kind}
                        onClick={() => setActiveKind(category.kind)}
                      >
                        <Icon aria-hidden="true" data-free-size="true" /> {category.filterLabel}
                      </button>
                    );
                  })}
                </fieldset>

                <ol className={styles.dashboardDemoComplaintList} aria-label="Complaints">
                  {visibleReports.map((report) => {
                    const Icon = landingDemoKindIcons[report.kind];
                    return (
                      <li key={report.title}>
                        <button
                          className={styles.dashboardDemoComplaintButton}
                          type="button"
                          aria-haspopup="dialog"
                          aria-label={`View feedback: ${report.title}`}
                          onClick={(event) => openReport(report, event.currentTarget)}
                        >
                          <span
                            className={`${styles.dashboardDemoComplaintIcon} ${landingDemoKindClass(report.kind)}`}
                          >
                            <Icon aria-hidden="true" data-free-size="true" />
                          </span>
                          <span className={styles.dashboardDemoComplaintCopy}>
                            <strong>{report.title}</strong>
                            <span className={styles.dashboardDemoComplaintMeta}>
                              {landingDemoCategory(report.kind).label} · {report.route} ·{" "}
                              {report.origin}
                            </span>
                          </span>
                          <time>{report.receivedLabel}</time>
                          <ArrowUpRight aria-hidden="true" data-free-size="true" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          </div>
        )}
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
