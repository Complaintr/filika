"use client";

import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileSearch,
  Inbox,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  TriangleAlert,
} from "lucide-react";
import styles from "./demo.module.css";
import { DEMO_STEPS } from "./demo-data";

export interface DemoFlowPanelProps {
  activeIndex: number;
  hidden: boolean;
  onNavigate(index: number): void;
  onReset(): void;
  onToggleHidden(): void;
}

const STEP_ICONS = {
  intro: Store,
  prompt: Bot,
  product: ShoppingBag,
  checkout: TriangleAlert,
  hidden: FileSearch,
  report: ClipboardCheck,
  review: ShieldCheck,
  result: Inbox,
} as const;

export function DemoFlowPanel({
  activeIndex,
  hidden,
  onNavigate,
  onReset,
  onToggleHidden,
}: DemoFlowPanelProps) {
  const last = DEMO_STEPS.length - 1;
  const progress = ((activeIndex + 1) / DEMO_STEPS.length) * 100;

  return (
    <aside
      className={`${styles.flowPanel} ${hidden ? styles.flowPanelHidden : ""}`}
      aria-label="Demo flow"
    >
      <header className={styles.flowPanelHeader}>
        {!hidden && (
          <div className={styles.flowPanelTitle}>
            <span className={styles.flowPanelEyebrow}>Demo flow</span>
            <h2>Follow the report</h2>
            <p>Eight short steps. You can jump ahead at any time.</p>
          </div>
        )}
        <button
          className={styles.flowIconButton}
          type="button"
          aria-label={hidden ? "Show demo flow" : "Hide demo flow"}
          aria-pressed={hidden}
          onClick={onToggleHidden}
        >
          {hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        </button>
      </header>

      {!hidden && (
        <>
          <div className={styles.flowProgress} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>

          <ol className={styles.flowSteps}>
            {DEMO_STEPS.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              const StepIcon = STEP_ICONS[step.id as keyof typeof STEP_ICONS];
              return (
                <li key={step.id}>
                  <button
                    className={`${styles.flowStep} ${active ? styles.flowStepActive : ""} ${done ? styles.flowStepDone : ""}`}
                    type="button"
                    aria-current={active ? "step" : undefined}
                    onClick={() => onNavigate(index)}
                  >
                    <span className={styles.flowStepNumber} aria-hidden="true">
                      {done ? <Check data-free-size="true" /> : <StepIcon />}
                    </span>
                    <span className={styles.flowStepCopy}>
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <footer className={styles.flowPanelFooter}>
            <div className={styles.flowNav}>
              <button
                className={styles.flowButton}
                type="button"
                disabled={activeIndex === 0}
                onClick={() => onNavigate(activeIndex - 1)}
              >
                <ChevronLeft aria-hidden="true" /> Back
              </button>
              <span className={styles.flowPosition}>
                {activeIndex + 1} / {DEMO_STEPS.length}
              </span>
              <button
                className={`${styles.flowButton} ${styles.flowButtonPrimary}`}
                type="button"
                disabled={activeIndex === last}
                onClick={() => onNavigate(activeIndex + 1)}
              >
                Next <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <button className={styles.resetButton} type="button" onClick={onReset}>
              <RotateCcw aria-hidden="true" /> Reset demo
            </button>
          </footer>
        </>
      )}
    </aside>
  );
}
