"use client";

import { Bot, Bug, Check, Inbox, MousePointerClick, Route } from "lucide-react";
import type React from "react";
import { forwardRef } from "react";
import styles from "../../app/landing.module.css";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string | undefined; children?: React.ReactNode; label?: string | undefined }
>(({ className, children, label }, ref) => {
  return (
    <div ref={ref} className={`${styles.flowCircle} ${className ?? ""}`.trim()}>
      {children}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
});

Circle.displayName = "Circle";

function FlowBeamPath({
  d,
  delay = 0,
  duration = 3,
}: {
  d: string;
  delay?: number | undefined;
  duration?: number | undefined;
}) {
  return (
    <>
      <path d={d} className={styles.beamPathInactive} />
      <path data-flow-beam="true" d={d} className={styles.beamPathActive} pathLength="1">
        <animate
          attributeName="stroke-dashoffset"
          values="1;0"
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </path>
    </>
  );
}

export function SiteScanFlowDemo({ className }: { className?: string | undefined }) {
  return (
    <div className={`${styles.scanContainer} ${className ?? ""}`.trim()}>
      <div className={styles.scanInner}>
        <div className={styles.scanBrowser}>
          <div className={styles.scanBrowserHeader}>
            <span className={styles.scanBrowserDot} />
            <span className={styles.scanBrowserDot} />
            <span className={styles.scanBrowserDot} />
            <span className={styles.scanBrowserUrl}>example.app</span>
          </div>
          <div className={styles.scanBrowserBody}>
            <div className={styles.scanSkeletonBar} style={{ width: "80px" }} />
            <div className={styles.scanSkeletonGrid}>
              <div>
                <div className={styles.scanSkeletonBar} style={{ width: "100%" }} />
                <div
                  className={styles.scanSkeletonBar}
                  style={{ width: "80%", marginTop: "8px" }}
                />
                <div className={styles.scanSkeletonBadge} />
              </div>
              <div className={styles.scanSkeletonBox} />
            </div>
            <div className={styles.scanSkeletonCards}>
              <div className={styles.scanSkeletonCard} />
              <div className={styles.scanSkeletonCard} />
              <div className={styles.scanSkeletonCard} />
            </div>

            <svg
              aria-hidden="true"
              viewBox="0 0 260 164"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <defs>
                <linearGradient id="site-scan-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#009fe3" stopOpacity="0" />
                  <stop offset="1" stopColor="#009fe3" stopOpacity="0.22" />
                </linearGradient>
              </defs>
              <rect x="0" y="-36" width="260" height="36" fill="url(#site-scan-glow)">
                <animate attributeName="y" values="-36;164;-36" dur="4s" repeatCount="indefinite" />
              </rect>
              <line
                data-site-scanner="true"
                x1="0"
                x2="260"
                y1="0"
                y2="0"
                stroke="#009fe3"
                strokeWidth="1.5"
                strokeOpacity="0.75"
              >
                <animate attributeName="y1" values="0;164;0" dur="4s" repeatCount="indefinite" />
                <animate attributeName="y2" values="0;164;0" dur="4s" repeatCount="indefinite" />
              </line>
            </svg>
            <span className="sr-only">Website under agent inspection</span>
          </div>
        </div>

        <Circle label="WebMCP agent scanning the website" className={styles.scanAgentCircle}>
          <Bot style={{ width: 28, height: 28 }} aria-hidden="true" data-free-size="true" />
        </Circle>
        <Circle
          label="Runtime bug found"
          className={`${styles.scanIssueCircle} ${styles.scanIssueBug}`}
        >
          <Bug style={{ width: 16, height: 16 }} aria-hidden="true" data-free-size="true" />
        </Circle>
        <Circle
          label="Interaction bug found"
          className={`${styles.scanIssueCircle} ${styles.scanIssueClick}`}
        >
          <MousePointerClick
            style={{ width: 16, height: 16 }}
            aria-hidden="true"
            data-free-size="true"
          />
        </Circle>
        <Circle
          label="Broken flow found"
          className={`${styles.scanIssueCircle} ${styles.scanIssueRoute}`}
        >
          <Route style={{ width: 16, height: 16 }} aria-hidden="true" data-free-size="true" />
        </Circle>

        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            pointerEvents: "none",
            width: "100%",
            height: "220px",
            maxWidth: "320px",
          }}
          viewBox="0 0 320 220"
          data-flow-canvas="site-scan"
        >
          <FlowBeamPath d="M 40 110 Q 92 72 152 95" />
          <FlowBeamPath d="M 40 110 Q 170 78 289 124" delay={0.6} />
          <FlowBeamPath d="M 40 110 Q 122 168 204 189" delay={1.2} />
        </svg>
      </div>
    </div>
  );
}

export function ResolutionFlowDemo({ className }: { className?: string | undefined }) {
  return (
    <div className={`${styles.resolutionContainer} ${className ?? ""}`.trim()}>
      <div className={styles.resolutionInner}>
        <div className={styles.resolutionColumn}>
          <Circle label="Observed bug" className={styles.resolutionSourceCircle}>
            <Bug style={{ width: 20, height: 20 }} aria-hidden="true" data-free-size="true" />
          </Circle>
          <Circle label="Blocked task" className={styles.resolutionSourceCircle}>
            <Route style={{ width: 20, height: 20 }} aria-hidden="true" data-free-size="true" />
          </Circle>
          <Circle label="Concrete idea" className={styles.resolutionSourceCircle}>
            <MousePointerClick
              style={{ width: 20, height: 20 }}
              aria-hidden="true"
              data-free-size="true"
            />
          </Circle>
        </div>
        <Circle label="Unified review inbox" className={styles.resolutionInboxCircle}>
          <Inbox style={{ width: 32, height: 32 }} aria-hidden="true" data-free-size="true" />
        </Circle>
        <Circle label="Reviewed and resolved" className={styles.resolutionCheckCircle}>
          <Check style={{ width: 28, height: 28 }} aria-hidden="true" data-free-size="true" />
        </Circle>
      </div>

      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          width: "100%",
          height: "220px",
          maxWidth: "320px",
        }}
        viewBox="0 0 320 220"
        data-flow-canvas="resolution"
      >
        <FlowBeamPath d="M 24 24 Q 90 24 156 110" />
        <FlowBeamPath d="M 24 110 Q 90 110 156 110" delay={0.5} />
        <FlowBeamPath d="M 24 196 Q 90 196 156 110" delay={1} />
        <FlowBeamPath d="M 156 110 Q 224 110 292 110" delay={1.5} duration={2.5} />
      </svg>
    </div>
  );
}
