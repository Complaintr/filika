import { Bot, Bug, Check, Database, Inbox, Layers, Lock, Route, ShieldCheck } from "lucide-react";
import { WorldGlobeDemo } from "@/components/world-globe-demo";
import styles from "./landing.module.css";

export { WorldGlobeDemo };

const discoveries = [
  ["Observed bug", "/checkout", "Code error"],
  ["Blocked task", "/onboarding", "Behavioral"],
  ["Confusing flow", "/settings/team", "UX flow"],
] as const;

const integrations = [
  ["React & Next.js", "WebMCP ready", Layers],
  ["WebMCP Agent", "Tools registered", Bot],
  ["PostgreSQL", "Collector ready", Database],
  ["Maintainer Inbox", "Realtime triage", Inbox],
] as const;

function DemoHeader({ title, label }: { title: string; label: string }) {
  return (
    <div className={styles.demoHeader}>
      <span>{title}</span>
      <span className={styles.demoHeaderBadge}>
        <i aria-hidden="true" /> {label}
      </span>
    </div>
  );
}

export function GlobeDemo() {
  return <WorldGlobeDemo />;
}

export function DiscoveryDashboardDemo() {
  return (
    <div className={styles.featureDemo}>
      <div className={styles.featureDemoInset}>
        <DemoHeader title="Live agent activity" label="Scanning" />
        <div className={styles.demoStats}>
          <div>
            <span>Issues found</span>
            <strong>04</strong>
          </div>
          <div>
            <span>Routes checked</span>
            <strong>18</strong>
          </div>
        </div>
        <div className={styles.discoveryFeed}>
          {discoveries.map(([type, path, tag]) => (
            <div className={styles.discoveryRow} key={type}>
              <span className={styles.discoveryIcon}>
                <Bug aria-hidden="true" data-free-size="true" />
              </span>
              <span>
                <b>{type}</b>
                <small>{path}</small>
              </span>
              <em>{tag}</em>
            </div>
          ))}
        </div>
        <span className={styles.discoveryScanner} aria-hidden="true" />
      </div>
    </div>
  );
}

export function BugAnalyticsDemo() {
  return (
    <div className={styles.featureDemo}>
      <div className={styles.featureDemoInset}>
        <DemoHeader title="Bug discovery" label="Live" />
        <div className={styles.miniChart}>
          <div className={styles.miniChartLabel}>
            <span>Runtime signals</span>
            <strong>+12.4%</strong>
          </div>
          <svg
            viewBox="0 0 420 124"
            preserveAspectRatio="none"
            aria-hidden="true"
            data-free-size="true"
          >
            <defs>
              <pattern
                id="landing-dashboard-dots"
                width="14"
                height="14"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" />
              </pattern>
              <linearGradient id="landing-chart-line" x1="0" x2="1">
                <stop offset="0" stopColor="#8fb0ff" />
                <stop offset="1" stopColor="#3478f6" />
              </linearGradient>
            </defs>
            <rect width="420" height="124" fill="url(#landing-dashboard-dots)" />
            <path
              className={styles.miniChartPath}
              pathLength="1"
              d="M 0 103 C 44 98 52 84 87 87 S 139 66 176 72 S 229 54 264 60 S 316 25 350 42 S 388 20 420 15"
            />
            <circle className={styles.miniChartFocus} cx="350" cy="42" r="5" />
          </svg>
          <div className={styles.miniChartTooltip}>
            <i />
            <span>Checkout error</span>
            <strong>12</strong>
          </div>
        </div>
        <div className={styles.bugAlert}>
          <span>
            <Bug aria-hidden="true" data-free-size="true" />
          </span>
          <span>
            <b>Checkout button unresponsive</b>
            <small>Reported with route and release context</small>
          </span>
          <em>New</em>
        </div>
      </div>
    </div>
  );
}

export function IntegrationHealthDemo() {
  return (
    <div className={styles.featureDemo}>
      <div className={styles.featureDemoInset}>
        <DemoHeader title="Environment health" label="Connecting" />
        <div className={styles.integrationList}>
          {integrations.map(([name, detail, Icon]) => (
            <div className={styles.integrationRow} key={name}>
              <span className={styles.integrationIcon}>
                <Icon aria-hidden="true" data-free-size="true" />
              </span>
              <span>
                <b>{name}</b>
                <small>{detail}</small>
              </span>
              <span className={styles.integrationStatus}>
                <span className={styles.integrationPending}>Checking</span>
                <span className={styles.integrationReady}>
                  <Check aria-hidden="true" data-free-size="true" /> Ready
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ApprovalFlowDemo() {
  return (
    <div className={styles.featureDemo}>
      <div className={styles.featureDemoInset}>
        <DemoHeader title="Report #184" label="Triage" />
        <div className={styles.approvalReport}>
          <div>
            <span className={styles.approvalReportIcon}>
              <Bug aria-hidden="true" data-free-size="true" />
            </span>
            <span>
              <b>Broken checkout step</b>
              <small>Agent-drafted report received</small>
            </span>
          </div>
          <span className={styles.privacyNote}>
            <Lock aria-hidden="true" data-free-size="true" /> Zero ambient data collected
          </span>
        </div>
        <div className={styles.approvalTimeline}>
          <span className={styles.approvalTrack} aria-hidden="true" />
          <span className={styles.approvalRunner} aria-hidden="true" />
          <div className={styles.approvalStage}>
            <Bot aria-hidden="true" data-free-size="true" />
            <span>Drafted</span>
          </div>
          <div className={styles.approvalStage}>
            <ShieldCheck aria-hidden="true" data-free-size="true" />
            <span>Ingested</span>
          </div>
          <div className={styles.approvalStage}>
            <Inbox aria-hidden="true" data-free-size="true" />
            <span>In inbox</span>
          </div>
        </div>
        <div className={styles.approvalAction}>
          <span className={styles.approvalWaiting}>
            <Route aria-hidden="true" data-free-size="true" /> Ingestion validated
          </span>
          <span className={styles.approvalComplete}>
            <Check aria-hidden="true" data-free-size="true" /> Ready for developer triage
          </span>
        </div>
      </div>
    </div>
  );
}
