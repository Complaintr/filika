import { Bug, CircleSlash2, Lightbulb, MessageSquareText, ShieldCheck } from "lucide-react";
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
    route: "/checkout/payment",
    time: "2 min ago",
    title: "Payment form resets after validation",
  },
  {
    kind: "Blocked task",
    kindClass: styles.dashboardDemoKindBlocked,
    route: "/onboarding/team",
    time: "18 min ago",
    title: "Team invite step cannot be completed",
  },
  {
    kind: "Idea",
    kindClass: styles.dashboardDemoKindIdea,
    route: "/settings/notifications",
    time: "42 min ago",
    title: "Add a digest frequency option",
  },
] as const;

export function LandingDashboardDemo() {
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
                <article key={report.title}>
                  <span className={`${styles.dashboardDemoKind} ${report.kindClass}`}>
                    {report.kind}
                  </span>
                  <strong>{report.title}</strong>
                  <span className={styles.dashboardDemoReportMeta}>
                    <span className={styles.dashboardDemoReportRoute}>{report.route}</span>
                    <time>{report.time}</time>
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
