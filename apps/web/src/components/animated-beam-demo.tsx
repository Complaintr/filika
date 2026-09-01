"use client";

import { Bot, Bug, Check, Inbox, MousePointerClick, Route } from "lucide-react";
import type React from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string | undefined; children?: React.ReactNode; label?: string | undefined }
>(({ className, children, label }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
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
      <path
        d={d}
        fill="none"
        stroke="#d4d4d8"
        strokeWidth="2"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />
      <path
        data-flow-beam="true"
        d={d}
        fill="none"
        pathLength="1"
        stroke="#009fe3"
        strokeWidth="2"
        strokeDasharray="0.14 0.86"
        strokeDashoffset="1"
        strokeLinecap="round"
      >
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
    <div
      className={cn(
        "relative flex h-[280px] w-full items-center justify-center px-2 py-4 sm:px-4",
        className,
      )}
    >
      <div className="relative h-[220px] w-full max-w-[320px]">
        <div className="absolute top-2 right-0 bottom-2 left-9 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_32px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#1f2028]">
          <div className="flex h-7 items-center gap-1.5 border-zinc-200 border-b px-3 dark:border-white/10">
            <span className="size-1.5 rounded-full bg-zinc-300" />
            <span className="size-1.5 rounded-full bg-zinc-300" />
            <span className="size-1.5 rounded-full bg-zinc-300" />
            <span className="ml-2 truncate text-[8px] text-zinc-400">example.app</span>
          </div>
          <div className="relative h-[calc(100%-28px)] overflow-hidden p-4">
            <div className="h-2 w-20 rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="mt-3 grid grid-cols-[1.15fr_0.85fr] gap-3">
              <div>
                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-white/10" />
                <div className="mt-2 h-2 w-4/5 rounded-full bg-zinc-200 dark:bg-white/10" />
                <div className="mt-3 h-5 w-16 rounded-md bg-[#009fe3]/12" />
              </div>
              <div className="h-16 rounded-lg bg-zinc-100 dark:bg-white/5" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="h-10 rounded-lg bg-zinc-100 dark:bg-white/5" />
              <div className="h-10 rounded-lg bg-zinc-100 dark:bg-white/5" />
              <div className="h-10 rounded-lg bg-zinc-100 dark:bg-white/5" />
            </div>

            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              viewBox="0 0 260 164"
              preserveAspectRatio="none"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <linearGradient id="site-scan-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#009fe3" stopOpacity="0" />
                  <stop offset="1" stopColor="#009fe3" stopOpacity="0.18" />
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
                strokeOpacity="0.65"
              >
                <animate attributeName="y1" values="0;164;0" dur="4s" repeatCount="indefinite" />
                <animate attributeName="y2" values="0;164;0" dur="4s" repeatCount="indefinite" />
              </line>
            </svg>
            <span className="sr-only">Website under agent inspection</span>
          </div>
        </div>

        <Circle
          label="WebMCP agent scanning the website"
          className="absolute top-1/2 left-3 size-14 -translate-y-1/2 p-3 text-[#009fe3] shadow-[0_6px_25px_rgba(0,159,227,0.22)] dark:bg-[#1f2028]"
        >
          <Bot className="size-7" aria-hidden="true" />
        </Circle>
        <Circle
          label="Runtime bug found"
          className="absolute top-[35%] left-[42%] size-9 p-2 ring-2 ring-[#009fe3]/15"
        >
          <Bug className="size-4 text-[#009fe3]" aria-hidden="true" />
        </Circle>
        <Circle
          label="Interaction bug found"
          className="absolute top-[48%] right-[4%] size-9 p-2 ring-2 ring-[#009fe3]/15"
        >
          <MousePointerClick className="size-4 text-[#009fe3]" aria-hidden="true" />
        </Circle>
        <Circle
          label="Broken flow found"
          className="absolute bottom-[6%] left-[58%] size-9 p-2 ring-2 ring-[#009fe3]/15"
        >
          <Route className="size-4 text-[#009fe3]" aria-hidden="true" />
        </Circle>

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          viewBox="0 0 320 220"
          data-flow-canvas="site-scan"
          style={{ width: "100%", height: "220px", maxWidth: "320px" }}
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
    <div
      className={cn(
        "relative flex h-[280px] w-full items-center justify-center px-2 py-4 sm:px-4",
        className,
      )}
    >
      <div className="flex size-full max-h-[220px] w-full max-w-[320px] items-center justify-between">
        <div className="flex h-full flex-col justify-between">
          <Circle label="Observed bug">
            <Bug className="size-5 text-[#009fe3]" aria-hidden="true" />
          </Circle>
          <Circle label="Blocked task">
            <Route className="size-5 text-[#009fe3]" aria-hidden="true" />
          </Circle>
          <Circle label="Concrete idea">
            <MousePointerClick className="size-5 text-[#009fe3]" aria-hidden="true" />
          </Circle>
        </div>
        <Circle
          label="Unified review inbox"
          className="size-16 p-3 text-[#009fe3] shadow-[0_6px_25px_rgba(0,159,227,0.22)] dark:bg-[#1f2028]"
        >
          <Inbox className="size-8" aria-hidden="true" />
        </Circle>
        <Circle
          label="Reviewed and resolved"
          className="size-14 border border-[#009fe3]/20 p-3 text-[#009fe3]"
        >
          <Check className="size-7" aria-hidden="true" />
        </Circle>
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[220px] w-full max-w-[320px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 320 220"
        data-flow-canvas="resolution"
        style={{ width: "100%", height: "220px", maxWidth: "320px" }}
      >
        <FlowBeamPath d="M 24 24 Q 90 24 156 110" />
        <FlowBeamPath d="M 24 110 Q 90 110 156 110" delay={0.5} />
        <FlowBeamPath d="M 24 196 Q 90 196 156 110" delay={1} />
        <FlowBeamPath d="M 156 110 Q 224 110 292 110" delay={1.5} duration={2.5} />
      </svg>
    </div>
  );
}
