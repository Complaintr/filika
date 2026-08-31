"use client";

import { MousePointer2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "../../app/landing.module.css";

interface StreamItem {
  id: number;
  type: string;
  typeClass: string;
  text: string;
  time: string;
  status: string;
  isNew?: boolean;
}

interface StreamItemTemplate {
  type: string;
  typeClass: string;
  text: string;
  time: string;
  status: string;
}

const BUG_POOL: StreamItemTemplate[] = [
  {
    type: "BUG",
    typeClass: "typeBug",
    text: "Confirmation route hangs on payment",
    time: "Just now",
    status: "Open",
  },
  {
    type: "BLOCKED",
    typeClass: "typeBlocked",
    text: "Export button missing tooltip",
    time: "Just now",
    status: "Open",
  },
  {
    type: "IDEA",
    typeClass: "typeIdea",
    text: "Group repeat reports automatically",
    time: "Just now",
    status: "Resolved",
  },
  {
    type: "BUG",
    typeClass: "typeBug",
    text: "Auth session drops on Safari private mode",
    time: "Just now",
    status: "Open",
  },
  {
    type: "TASK",
    typeClass: "typeBlocked",
    text: "Dark mode contrast ratio low in modal",
    time: "Just now",
    status: "Open",
  },
];

interface AgentLogEntry {
  id: string;
  tag: string;
  tagClass: string;
  text: string;
  isError?: boolean;
}

const AGENT_LOGS: AgentLogEntry[] = [
  { id: "1", tag: "NAV", tagClass: "logNav", text: "GET /checkout -> 200 OK" },
  { id: "2", tag: "ACT", tagClass: "logAct", text: "click('button#place-order')" },
  { id: "3", tag: "NET", tagClass: "logNet", text: "POST /api/order/submit -> 504 TIMEOUT" },
  {
    id: "4",
    tag: "ERR",
    tagClass: "logErr",
    text: "UI stuck in 'submitting' (3/3 attempts)",
    isError: true,
  },
  {
    id: "5",
    tag: "WEBMCP",
    tagClass: "logMcp",
    text: "Captured stack trace -> checkout.tsx:96",
  },
];

const CLEAN_BARS = [
  { id: 1, height: "35%" },
  { id: 2, height: "48%" },
  { id: 3, height: "38%" },
  { id: 4, height: "65%" },
  { id: 5, height: "50%" },
  { id: 6, height: "72%" },
  { id: 7, height: "62%" },
  { id: 8, height: "82%" },
  { id: 9, height: "55%" },
  { id: 10, height: "76%" },
  { id: 11, height: "78%" },
];

interface MergedItem {
  id: number;
  badge: string;
  kind: "bug" | "blocked" | "idea";
  title: string;
  totalComplaints: number;
  bugReports: number;
  blockedTasks: number;
  ideas: number;
}

const MERGED_POOL: MergedItem[] = [
  {
    id: 1,
    badge: "H",
    kind: "bug",
    title: "fix: Unexpected JSON value",
    totalComplaints: 24,
    bugReports: 14,
    blockedTasks: 7,
    ideas: 3,
  },
  {
    id: 2,
    badge: "PR",
    kind: "bug",
    title: "fix: Confirmation route hangs after payment",
    totalComplaints: 25,
    bugReports: 15,
    blockedTasks: 7,
    ideas: 3,
  },
  {
    id: 3,
    badge: "UI",
    kind: "idea",
    title: "fix: Dark mode contrast ratio low in modal",
    totalComplaints: 26,
    bugReports: 15,
    blockedTasks: 7,
    ideas: 4,
  },
  {
    id: 4,
    badge: "API",
    kind: "bug",
    title: "fix: Auth session drops on Safari private mode",
    totalComplaints: 27,
    bugReports: 16,
    blockedTasks: 7,
    ideas: 4,
  },
  {
    id: 5,
    badge: "SDK",
    kind: "blocked",
    title: "fix: Export button missing tooltip",
    totalComplaints: 28,
    bugReports: 16,
    blockedTasks: 8,
    ideas: 4,
  },
];

const fallbackMerged: MergedItem = {
  id: 1,
  badge: "H",
  kind: "bug",
  title: "fix: Unexpected JSON value",
  totalComplaints: 24,
  bugReports: 14,
  blockedTasks: 7,
  ideas: 3,
};

export function RealtimeFlowBoard() {
  const [logCount, setLogCount] = useState(1);
  const [mergedIndex, setMergedIndex] = useState(0);
  const [streamItems, setStreamItems] = useState<StreamItem[]>([
    {
      id: 1,
      type: "BUG",
      typeClass: "typeBug",
      text: "Login times out after update",
      time: "8s",
      status: "Open",
    },
    {
      id: 2,
      type: "BLOCKED",
      typeClass: "typeBlocked",
      text: "Export button missing tooltip",
      time: "14s",
      status: "Open",
    },
    {
      id: 3,
      type: "IDEA",
      typeClass: "typeIdea",
      text: "Group repeat reports automatically",
      time: "1m",
      status: "Resolved",
    },
    {
      id: 4,
      type: "TASK",
      typeClass: "typeBlocked",
      text: "Dark mode contrast ratio low in modal",
      time: "2m",
      status: "Open",
    },
  ]);

  // Stream agent console logs sequentially
  useEffect(() => {
    const logTimer = setInterval(() => {
      setLogCount((prev) => (prev >= AGENT_LOGS.length ? 1 : prev + 1));
    }, 1400);
    return () => clearInterval(logTimer);
  }, []);

  // Prepend new incoming bugs sequentially stacking on top
  useEffect(() => {
    let poolIndex = 0;
    const streamTimer = setInterval(() => {
      const template = BUG_POOL[poolIndex % BUG_POOL.length];
      if (!template) return;
      poolIndex++;

      const newItem: StreamItem = {
        id: Date.now(),
        type: template.type,
        typeClass: template.typeClass,
        text: template.text,
        time: template.time,
        status: template.status,
        isNew: true,
      };

      setStreamItems((prev) => [
        newItem,
        ...prev.slice(0, 3).map((item) => ({ ...item, isNew: false })),
      ]);
    }, 2800);

    return () => clearInterval(streamTimer);
  }, []);

  // Flow through merged fixes sequentially
  useEffect(() => {
    const resTimer = setInterval(() => {
      setMergedIndex((prev) => (prev + 1) % MERGED_POOL.length);
    }, 2800);
    return () => clearInterval(resTimer);
  }, []);

  const visibleLogs = AGENT_LOGS.slice(0, logCount);
  const consoleStatus =
    logCount < 3
      ? { label: "EXECUTING", className: styles.consoleStatusRunning }
      : logCount < 5
        ? { label: "504 TIMEOUT", className: styles.consoleStatusTimeout }
        : { label: "BLOCKER CAPTURED", className: styles.consoleStatusCaptured };

  const currentMerged: MergedItem = MERGED_POOL[mergedIndex] ?? fallbackMerged;

  return (
    <div className={styles.flowBoardContainer}>
      <div className={styles.reportBoard}>
        {/* Column 1: What agents notice */}
        <div className={styles.signalColumn}>
          <div className={styles.boardColumnHeader}>
            <div>
              <span>Agent signals</span>
              <strong>What agents notice</strong>
            </div>
          </div>

          <div className={styles.signalList}>
            {/* Card 1: Live Friction Intercept */}
            <article className={styles.signalCard}>
              <div className={styles.signalMeta}>
                <span className={styles.pulseTag}>
                  <span className={styles.pulseDot} />
                  Observed bug
                </span>
                <span>/checkout · retry 3/3</span>
              </div>

              <h3>Confirmation route hangs after payment</h3>

              <div className={styles.miniConsole}>
                <div className={styles.consoleHeader}>
                  <span>agent_session.log</span>
                  <span className={consoleStatus.className}>{consoleStatus.label}</span>
                </div>
                <div className={styles.consoleLogBody}>
                  {visibleLogs.map((log, index) => (
                    <div key={log.id} className={styles.consoleLogRow}>
                      <span className={`${styles.logTag} ${styles[log.tagClass]}`}>{log.tag}</span>
                      <span className={log.isError ? styles.logTextError : styles.logText}>
                        {log.text}
                      </span>
                      {index === visibleLogs.length - 1 && logCount < AGENT_LOGS.length && (
                        <span className={styles.consoleBlinkCursor}>_</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.flowCardFooter}>
                <span className={styles.flowStageBadgeRed}>
                  <span className={styles.sonarDot} /> Blocker detected
                </span>
              </div>
            </article>

            {/* Card 2: Real-time Live Incoming Bug Stream (Stacking from top) */}
            <article className={styles.signalCard}>
              <div className={styles.signalMeta}>
                <span className={styles.liveStreamHeader}>
                  <span className={styles.liveStreamRadio} />
                  Live stream
                </span>
                <span>id: flk_stream_live</span>
              </div>

              <h3>Real-time agent friction stream</h3>

              <div className={styles.miniInboxList}>
                {streamItems.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.inboxRowItem} ${item.isNew ? styles.inboxRowNew : ""}`}
                  >
                    <span className={`${styles.typeBadge} ${styles[item.typeClass]}`}>
                      {item.type}
                    </span>
                    <span className={styles.inboxRowTitle}>{item.text}</span>
                    <span className={styles.badgeTime}>{item.time}</span>
                    <span
                      className={
                        item.status === "Resolved" ? styles.statusResolved : styles.statusOpen
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.flowCardFooter}>
                <span className={styles.flowStageBadgeAmber}>
                  <span className={styles.sonarDot} /> Bugs arriving sequentially
                </span>
              </div>
            </article>
          </div>
        </div>

        {/* Column 2: What maintainers receive */}
        <div className={styles.reportColumn}>
          <div className={styles.boardColumnHeader}>
            <div>
              <span>Reviewed reports</span>
              <strong>What maintainers receive</strong>
            </div>
          </div>

          <div className={styles.reportList}>
            {/* Card 3: User Review Gate */}
            <article className={styles.reportCard} data-tone="aqua">
              <div className={styles.reportCardTopline}>
                <span className={styles.statusBadgeTriage}>Ready for triage</span>
                <span className={styles.dupBadge}>Duplicate-safe</span>
              </div>

              <div className={styles.reportCardCopy}>
                <h3>Checkout confirmation pending</h3>
              </div>

              <div className={styles.reportTags}>
                <span>/checkout</span>
                <span>3 steps</span>
                <span>checkout-form.tsx</span>
              </div>

              <div className={styles.reviewSimulatorBox}>
                <div className={styles.simReviewHeader}>
                  <span>User verification gate</span>
                  <span className={styles.simStatusPill}>
                    <span className={styles.simStatusDot} />
                    Active draft
                  </span>
                </div>
                <div className={styles.simReviewBody}>
                  <div className={styles.simButtonTrigger}>
                    <div className={styles.simApproveButton}>
                      <ShieldCheck aria-hidden="true" />
                      <span>User reviewed</span>
                    </div>
                    <div className={styles.simCursorPointer}>
                      <MousePointer2 aria-hidden="true" />
                    </div>
                  </div>
                  <div className={styles.simVerifyNotice}>
                    <span>Zero ambient data · Approved</span>
                  </div>
                </div>
                <div className={styles.flowCardFooter}>
                  <span className={styles.flowStageBadgeGreen}>
                    <span className={styles.sonarDot} /> Transmitted
                  </span>
                </div>
              </div>
            </article>

            {/* Card 4: Maintainer Triage & Resolution Dashboard */}
            <article className={styles.reportCard} data-tone="violet">
              <div className={styles.reportCardTopline}>
                <span>Maintainer workspace</span>
                <span className={styles.velocityPill}>+34% velocity</span>
              </div>

              <div className={styles.reportCardCopy}>
                <h3>Triage velocity & live resolution</h3>
              </div>

              {/* 4 Clean Stat Tiles Matching Real Dashboard */}
              <div className={styles.cleanStatsRow}>
                <div className={styles.cleanStatBox}>
                  <span title="Total complaints">Total complaints</span>
                  <strong key={currentMerged.totalComplaints} className={styles.statCountAnim}>
                    {currentMerged.totalComplaints}
                  </strong>
                </div>
                <div className={styles.cleanStatBox}>
                  <span title="Bug reports">Bug reports</span>
                  <strong key={currentMerged.bugReports} className={styles.statCountAnim}>
                    {currentMerged.bugReports}
                  </strong>
                </div>
                <div className={styles.cleanStatBox}>
                  <span title="Blocked tasks">Blocked tasks</span>
                  <strong key={currentMerged.blockedTasks} className={styles.statCountAnim}>
                    {currentMerged.blockedTasks}
                  </strong>
                </div>
                <div className={styles.cleanStatBox}>
                  <span title="Ideas">Ideas</span>
                  <strong key={currentMerged.ideas} className={styles.statCountAnim}>
                    {currentMerged.ideas}
                  </strong>
                </div>
              </div>

              {/* Tall Clean Bar Chart */}
              <div className={styles.cleanChartCard}>
                {CLEAN_BARS.map((bar, idx) => (
                  <div
                    key={bar.id}
                    className={styles.cleanChartBar}
                    style={{
                      height: idx === (mergedIndex * 2) % CLEAN_BARS.length ? "88%" : bar.height,
                    }}
                  />
                ))}
                <div
                  className={`${styles.cleanChartBar} ${styles.cleanChartBarActive}`}
                  style={{ height: `${84 + (mergedIndex % 3) * 6}%` }}
                />
              </div>

              {/* Clean Flowing Merged Ticket Row */}
              <div key={currentMerged?.id} className={styles.cleanResolvedRow}>
                <span className={styles.cleanCircleBadge}>{currentMerged?.badge}</span>
                <span className={`${styles.cleanResolvedTitle} ${styles.cleanTitleTransition}`}>
                  {currentMerged?.title}
                </span>
                <span className={styles.cleanMergedPill}>Merged</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
