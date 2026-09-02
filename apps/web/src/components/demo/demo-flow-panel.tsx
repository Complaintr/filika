"use client";

import { ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from "lucide-react";
import styles from "./demo.module.css";
import { DEMO_STEPS } from "./demo-data";

export interface DemoFlowPanelProps {
  activeIndex: number;
  hidden: boolean;
  onNavigate(index: number): void;
  onReset(): void;
  onToggleHidden(): void;
}

export function DemoFlowPanel({
  activeIndex,
  hidden,
  onNavigate,
  onReset,
  onToggleHidden,
}: DemoFlowPanelProps) {
  const last = DEMO_STEPS.length - 1;
  return (
    <aside
      className={`${styles.flowPanel} ${hidden ? styles.flowPanelHidden : ""}`}
      aria-label="Demo flow"
    >
      <header className={styles.flowPanelHeader}>
        <div>
          <span className={styles.flowPanelEyebrow}>Demo flow</span>
          <h2>Try Filika</h2>
        </div>
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
          <ol className={styles.flowSteps}>
            {DEMO_STEPS.map((step, index) => (
              <li key={step.id}>
                <button
                  className={`${styles.flowStep} ${index === activeIndex ? styles.flowStepActive : ""}`}
                  type="button"
                  aria-current={index === activeIndex ? "step" : undefined}
                  onClick={() => onNavigate(index)}
                >
                  <span className={styles.flowStepNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.flowStepCopy}>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </span>
                </button>
              </li>
            ))}
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
