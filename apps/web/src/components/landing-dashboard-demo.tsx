"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircleSlash2,
  Copy,
  ExternalLink,
  Inbox,
  Lightbulb,
  type LucideIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import styles from "../../app/landing.module.css";
import {
  LANDING_DEMO_CATEGORIES,
  LANDING_DEMO_REPORTS,
  type LandingDemoFeedbackKind,
  type LandingDemoReport,
  landingDemoCategory,
} from "./landing-workspace-demo-data";

type WidgetRangeDays = 7 | 30 | 90;

const RANGE_OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

const RANGE_DEMO_COUNTS = {
  7: { bug: 21, blocked_task: 15, confusing_behavior: 12, idea: 10 },
  30: { bug: 81, blocked_task: 55, confusing_behavior: 46, idea: 38 },
  90: { bug: 198, blocked_task: 142, confusing_behavior: 116, idea: 96 },
} as const;

function rangeDemoCategories(range: WidgetRangeDays) {
  const counts = RANGE_DEMO_COUNTS[range];
  const total = LANDING_DEMO_CATEGORIES.reduce((sum, category) => sum + counts[category.kind], 0);
  return LANDING_DEMO_CATEGORIES.map((category) => ({
    ...category,
    count: counts[category.kind],
    percentage: Math.round((counts[category.kind] / total) * 100),
  }));
}

function WidgetRangeMenu({
  range,
  onChange,
}: {
  range: WidgetRangeDays;
  onChange: (days: WidgetRangeDays) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const currentLabel =
    RANGE_OPTIONS.find((option) => option.days === range)?.label ?? "Last 30 days";

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')
      ?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function select(nextDays: WidgetRangeDays) {
    setOpen(false);
    if (nextDays !== range) onChange(nextDays);
    triggerRef.current?.focus();
  }

  return (
    <div className={styles.dashboardDemoRangeControl} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.dashboardDemoRangeTrigger}
        aria-label="Dashboard date range"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {currentLabel}
        <ChevronDown aria-hidden="true" data-free-size="true" />
      </button>
      {open ? (
        <div
          id={menuId}
          ref={menuRef}
          className={styles.dashboardDemoRangeMenu}
          role="menu"
          aria-label="Dashboard date range"
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
          }}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
            );
            if (!items.length) return;
            event.preventDefault();
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }}
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              role="menuitemradio"
              aria-checked={option.days === range}
              onClick={() => select(option.days)}
            >
              {option.label}
              <Check aria-hidden="true" data-free-size="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const chartValues = [
  2, 3, 1, 4, 5, 3, 2, 6, 8, 5, 3, 7, 9, 6, 8, 10, 7, 4, 3, 8, 7, 11, 9, 13, 10, 12, 11, 14, 13, 16,
] as const;
const chartMaximum = Math.max(4, ...chartValues);
const chartPoints = chartValues.map((count, index) => ({
  count,
  x: 42 + (index * 776) / (chartValues.length - 1),
  y: 232 - (count / chartMaximum) * 172,
}));
const chartPath = chartPoints.reduce((path, point, index) => {
  if (index === 0) return `M ${point.x} ${point.y}`;
  const previous = chartPoints[index - 1];
  if (!previous) return path;
  const middle = (previous.x + point.x) / 2;
  return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
}, "");

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
  const widgetRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const categoryButtonsRef = useRef<Partial<Record<LandingDemoFeedbackKind, HTMLButtonElement>>>(
    {},
  );
  const lastCategoryKindRef = useRef<LandingDemoFeedbackKind | null>(null);
  const complaintsHeadingRef = useRef<HTMLHeadingElement>(null);
  const [reports, setReports] = useState<readonly LandingDemoReport[]>(LANDING_DEMO_REPORTS);
  const [activeReport, setActiveReport] = useState<LandingDemoReport>(LANDING_DEMO_REPORTS[0]);
  const [activeKind, setActiveKind] = useState<LandingDemoFeedbackKind | null>(null);
  const [range, setRange] = useState<WidgetRangeDays>(30);
  const [view, setView] = useState<"complaints" | "dashboard">("dashboard");

  const categories = rangeDemoCategories(range);
  const rangeTotal = categories.reduce((sum, category) => sum + category.count, 0);
  const stats = [
    ["Total complaints", String(rangeTotal)],
    ["Bug reports", String(categories.find((category) => category.kind === "bug")?.count ?? 0)],
    [
      "Blocked tasks",
      String(categories.find((category) => category.kind === "blocked_task")?.count ?? 0),
    ],
    ["Ideas", String(categories.find((category) => category.kind === "idea")?.count ?? 0)],
  ] as const;

  const visibleReports =
    activeKind === null ? reports : reports.filter((report) => report.kind === activeKind);

  function shuffleReports(): readonly LandingDemoReport[] {
    const shuffled = [...LANDING_DEMO_REPORTS];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const current = shuffled[index];
      const replacement = shuffled[swap];
      if (current === undefined || replacement === undefined) continue;
      shuffled[index] = replacement;
      shuffled[swap] = current;
    }
    return shuffled;
  }

  const refreshInbox = () => {
    setReports(shuffleReports());
    setActiveKind(null);
  };

  const moveReport = (delta: number) => {
    const index = visibleReports.indexOf(activeReport);
    const nextIndex = (index + delta + visibleReports.length) % visibleReports.length;
    const next = visibleReports[nextIndex];
    if (next !== undefined) setActiveReport(next);
  };

  useEffect(() => {
    if (view === "complaints") {
      complaintsHeadingRef.current?.focus({ preventScroll: true });
    } else if (lastCategoryKindRef.current) {
      categoryButtonsRef.current[lastCategoryKindRef.current]?.focus({ preventScroll: true });
    }
  }, [view]);

  const closeDialog = () => dialogRef.current?.close();
  const openReport = (report: LandingDemoReport, invoker: HTMLButtonElement) => {
    setActiveReport(report);
    invokerRef.current = invoker;
    if (!dialogRef.current?.open) dialogRef.current?.show();
    queueMicrotask(() => closeButtonRef.current?.focus({ preventScroll: true }));
  };
  const openComplaints = (kind: LandingDemoFeedbackKind) => {
    lastCategoryKindRef.current = kind;
    setActiveKind(kind);
    setView("complaints");
    if (typeof window !== "undefined" && window.innerWidth <= 640) {
      widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const showDashboard = () => {
    setView("dashboard");
    queueMicrotask(() => {
      if (lastCategoryKindRef.current) {
        categoryButtonsRef.current[lastCategoryKindRef.current]?.focus({ preventScroll: true });
      }
    });
  };

  return (
    <section ref={widgetRef} className={styles.dashboardDemo} aria-label="Filika dashboard preview">
      <header className={styles.dashboardDemoTopbar}>
        <div className={styles.dashboardDemoBrand}>
          <FilikaBrand href="/" label="Filika home" className={styles.dashboardDemoLogo} />
          <span className={styles.dashboardDemoSeparator} aria-hidden="true">
            /
          </span>
          <button
            className={styles.dashboardDemoApplication}
            type="button"
            aria-label="Back to preview dashboard"
            onClick={showDashboard}
          >
            <i aria-hidden="true">F</i>
            <small>Filika Demo</small>
          </button>
        </div>
        <div className={styles.dashboardDemoProfile} aria-hidden="true">
          <i />
          <span className={styles.dashboardDemoProfileAvatar}>ER</span>
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
              <WidgetRangeMenu range={range} onChange={setRange} />
            </div>

            <div className={styles.dashboardDemoStats}>
              {stats.map(([label, value]) => (
                <article key={label}>
                  <span>
                    {label} <i aria-hidden="true">i</i>
                  </span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>

            <div className={styles.dashboardDemoGrid}>
              <section className={styles.dashboardDemoChart} aria-labelledby="landing-chart-title">
                <div className={styles.dashboardDemoChartTitle}>
                  <h3 id="landing-chart-title">Complaint activity</h3>
                  <span>Daily volume · UTC · {range} days</span>
                </div>
                <svg
                  viewBox="0 0 860 290"
                  data-free-size="true"
                  role="img"
                  aria-label={`${rangeTotal} complaints over the last ${range} days`}
                >
                  <defs>
                    <pattern
                      id="landing-dashboard-grid"
                      width="12"
                      height="12"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r="1" />
                    </pattern>
                  </defs>
                  <rect
                    x="22"
                    y="24"
                    width="816"
                    height="220"
                    fill="url(#landing-dashboard-grid)"
                  />
                  <path className={styles.dashboardDemoChartLine} d={chartPath} />
                  {[
                    [42, "Aug 5", "start"],
                    [301, "Aug 14", "middle"],
                    [560, "Aug 24", "middle"],
                    [818, "Sep 3", "end"],
                  ].map(([x, label, anchor]) => (
                    <text
                      key={label}
                      x={x}
                      y="270"
                      textAnchor={anchor as "end" | "middle" | "start"}
                      className={styles.dashboardDemoChartLabel}
                    >
                      {label}
                    </text>
                  ))}
                </svg>
              </section>

              <section
                className={styles.dashboardDemoBreakdown}
                aria-labelledby="landing-breakdown-title"
              >
                <div className={styles.dashboardDemoPanelHeading}>
                  <h3 id="landing-breakdown-title">By feedback type</h3>
                  <span className={styles.dashboardDemoPanelMeta}>Share of reports</span>
                </div>
                <div className={styles.dashboardDemoBreakdownList}>
                  {categories.map((category) => (
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
              <div className={styles.dashboardDemoComplaintsTitle}>
                <button className={styles.dashboardDemoBack} type="button" onClick={showDashboard}>
                  <ArrowLeft aria-hidden="true" data-free-size="true" /> Back to dashboard
                </button>
                <h2 ref={complaintsHeadingRef} tabIndex={-1}>
                  All complaints
                </h2>
                <p>A closer look at the feedback behind your product.</p>
              </div>
              <button className={styles.dashboardDemoRefresh} type="button" onClick={refreshInbox}>
                <RefreshCw aria-hidden="true" data-free-size="true" /> Refresh inbox
              </button>
            </div>

            <section className={styles.dashboardDemoInbox} aria-label="Demo feedback inbox">
              <div className={styles.dashboardDemoPanelHeading}>
                <h3>Your inbox</h3>
                <span className={styles.dashboardDemoPanelMeta}>
                  {visibleReports.length} reports on this page
                </span>
              </div>
              <div className={styles.dashboardDemoInboxInset}>
                <div className={styles.dashboardDemoInboxToolbar}>
                  <label className={styles.dashboardDemoSearch}>
                    <Search aria-hidden="true" data-free-size="true" />
                    <input
                      aria-label="Search demo complaints"
                      type="search"
                      placeholder="Search complaints…"
                    />
                  </label>
                  <span className={styles.dashboardDemoSort}>Newest first</span>
                </div>
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
                <footer className={styles.dashboardDemoInboxFooter}>
                  <span>Page 1</span>
                  <div>
                    <button type="button" disabled>
                      <ChevronLeft aria-hidden="true" data-free-size="true" /> Previous
                    </button>
                    <button type="button" disabled>
                      Next <ChevronRight aria-hidden="true" data-free-size="true" />
                    </button>
                  </div>
                </footer>
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
        onClose={() => invokerRef.current?.focus({ preventScroll: true })}
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
            <span className={styles.dashboardDemoDialogLabel}>
              <strong>Report content</strong>
              <small>{landingDemoCategory(activeReport.kind).label}</small>
            </span>
            <span className={styles.dashboardDemoDialogActions}>
              <button
                className={styles.dashboardDemoDialogAction}
                type="button"
                aria-label="Previous preview report"
                disabled={visibleReports.length <= 1}
                onClick={() => moveReport(-1)}
              >
                <ArrowLeft aria-hidden="true" data-free-size="true" />
              </button>
              <button
                className={styles.dashboardDemoDialogAction}
                type="button"
                aria-label="Next preview report"
                disabled={visibleReports.length <= 1}
                onClick={() => moveReport(1)}
              >
                <ArrowRight aria-hidden="true" data-free-size="true" />
              </button>
              <button
                ref={closeButtonRef}
                className={styles.dashboardDemoDialogAction}
                type="button"
                aria-label="Close feedback details"
                onClick={closeDialog}
              >
                <X aria-hidden="true" data-free-size="true" />
              </button>
            </span>
          </header>
          <div className={styles.dashboardDemoDialogInset}>
            <div className={styles.dashboardDemoDialogContent}>
              <div className={styles.dashboardDemoDialogTitle}>
                <h2 id="landing-feedback-detail-title">{activeReport.title}</h2>
                <p>
                  Received {activeReport.receivedLabel} · {activeReport.route}
                </p>
              </div>
              <div className={styles.dashboardDemoDialogSections}>
                <section>
                  <h3>What happened</h3>
                  <p>{activeReport.description}</p>
                </section>
                <section>
                  <h3>What was expected</h3>
                  <p>{activeReport.expectedBehavior}</p>
                </section>
                <section>
                  <h3>Report context</h3>
                  <dl>
                    <div>
                      <dt>Origin</dt>
                      <dd>{activeReport.origin}</dd>
                    </div>
                    <div>
                      <dt>Page</dt>
                      <dd>{activeReport.route}</dd>
                    </div>
                    <div>
                      <dt>Release</dt>
                      <dd>2026.09.03</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>WebMCP agent</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          </div>
          <footer className={styles.dashboardDemoDialogFooter}>
            <span className={styles.dashboardDemoDialogFooterLead}>
              <button
                className={styles.dashboardDemoDialogBack}
                type="button"
                onClick={closeDialog}
              >
                <ArrowLeft aria-hidden="true" data-free-size="true" /> Back to complaints
              </button>
              <span className={styles.dashboardDemoDialogFooterNote}>
                <ShieldCheck aria-hidden="true" data-free-size="true" />
                Read-only feedback. External content is untrusted.
              </span>
            </span>
            <span className={styles.dashboardDemoDialogFooterActions}>
              <button type="button">
                <Copy aria-hidden="true" data-free-size="true" /> Copy link
              </button>
              <button type="button" aria-label="Open preview report page">
                <ExternalLink aria-hidden="true" data-free-size="true" />
              </button>
            </span>
          </footer>
        </div>
      </dialog>
    </section>
  );
}
