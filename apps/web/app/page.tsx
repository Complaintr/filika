import {
  ArrowRight,
  CircleAlert,
  Code2,
  FileCode2,
  GitFork,
  GitPullRequestArrow,
  MessageSquareText,
  MousePointer2,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { FilikaBrand } from "@/components/filika-brand";
import { LandingHeader } from "@/components/landing-header";
import { RealtimeFlowBoard } from "@/components/realtime-flow-board";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Feedback infrastructure for AI agents",
  description:
    "Turn bugs, blockers, and product feedback into precise, user-reviewed reports with WebMCP and code context.",
};

const principles = [
  {
    icon: MessageSquareText,
    title: "More than a screenshot",
    copy: "Full repro steps, expected behavior, and technical context in one report.",
  },
  {
    icon: Code2,
    title: "Direct code context",
    copy: "Pinpoints the affected route, component, and source file.",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed before it leaves",
    copy: "Users review and approve every report before transmission.",
  },
];

const workflow = [
  {
    title: "Agent encounters blocker",
    copy: "Captures friction during task execution.",
    icon: CircleAlert,
  },
  {
    title: "Structured draft",
    copy: "WebMCP bundles relevant context for user approval.",
    icon: MousePointer2,
  },
  {
    title: "Actionable report",
    copy: "Delivers directly to maintainers with code links.",
    icon: GitPullRequestArrow,
  },
];

export default function HomePage() {
  return (
    <main className={styles.page} id="app-content">
      <LandingHeader />
      <section className={styles.hero}>
        <div className={styles.heroTexture} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <h1>Turn agent friction into feedback your team can ship.</h1>
          <p>User-reviewed agent feedback, linked directly to code.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="/login">
              Open workspace
              <ArrowRight aria-hidden="true" />
            </a>
            <a
              className={styles.secondaryButton}
              href="https://github.com/Complaintr/filika"
              rel="noreferrer"
              target="_blank"
            >
              <GitFork aria-hidden="true" />
              View source
            </a>
          </div>
        </div>

        <div className={styles.productStage} id="product">
          <div className={styles.windowBar}>
            <div className={styles.windowDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className={styles.windowAddress}>app.filika.dev · Checkout</span>
            <span className={styles.secureStatus}>
              <ShieldCheck aria-hidden="true" /> Review required
            </span>
          </div>

          <div className={styles.productCanvas}>
            <div className={styles.contextPanel}>
              <div className={styles.contextHeader}>
                <span>Agent context</span>
                <span className={styles.contextStatus}>Issue detected</span>
              </div>
              <div className={styles.issueTitle}>
                <CircleAlert aria-hidden="true" />
                <div>
                  <span>Checkout blocker</span>
                  <strong>Order confirmation never appears</strong>
                </div>
              </div>
              <div className={styles.codeCard}>
                <div className={styles.codeHeader}>
                  <span>
                    <FileCode2 aria-hidden="true" /> checkout-form.tsx
                  </span>
                  <span>96:14</span>
                </div>
                <pre>
                  <code>
                    <span>94</span> await submitOrder(payload);{"\n"}
                    <span>95</span> setSubmitting(false);{"\n"}
                    <mark>
                      <span>96</span> router.push(receiptUrl);
                    </mark>
                  </code>
                </pre>
              </div>
              <div className={styles.signalGrid}>
                <span>
                  <small>Reproduced</small>3 of 3 attempts
                </span>
                <span>
                  <small>Route</small>
                  /checkout
                </span>
                <span>
                  <small>Impact</small>
                  Task blocked
                </span>
              </div>
            </div>

            <div className={styles.widgetReserve}>
              <div className={styles.reserveBadge}>Reserved product surface</div>
              <div className={styles.reserveFrame}>
                <MessageSquareText aria-hidden="true" />
                <strong>Interactive widget preview</strong>
                <span>This area is ready for the real Filika widget.</span>
              </div>
              <div className={styles.reserveFooter}>
                <span>User reviews the report</span>
                <span>
                  Nothing is sent yet <Send aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.principles} aria-label="Filika product principles">
        {principles.map(({ icon: Icon, title, copy }) => (
          <article key={title}>
            <Icon aria-hidden="true" />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className={styles.workflowSection} id="workflow" aria-labelledby="workflow-title">
        <div className={styles.sectionHeading}>
          <h2 id="workflow-title">A feedback path designed for people and agents.</h2>
        </div>

        <div className={styles.workflowGrid}>
          {workflow.map(({ title, copy, icon: Icon }) => (
            <article key={title} className={styles.workflowCard}>
              <div className={styles.workflowTopline}>
                <Icon aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.reportBoardSection} id="reports" aria-labelledby="reports-title">
        <div className={styles.reportBoardHeading}>
          <h2 id="reports-title">See the signal. Ship the fix.</h2>
        </div>

        <RealtimeFlowBoard />
      </section>

      <section className={styles.safetySection} id="safety" aria-labelledby="safety-title">
        <div className={styles.safetyCopy}>
          <h2 id="safety-title">Nothing is transmitted before the user confirms it.</h2>
        </div>

        <div className={styles.safetyChecklist}>
          <div>
            <span className={styles.safetyIndex}>01</span>
            <div className={styles.safetyItemContent}>
              <strong>Explicit review</strong>
            </div>
          </div>
          <div>
            <span className={styles.safetyIndex}>02</span>
            <div className={styles.safetyItemContent}>
              <strong>Bounded context</strong>
            </div>
          </div>
          <div>
            <span className={styles.safetyIndex}>03</span>
            <div className={styles.safetyItemContent}>
              <strong>Graceful fallback</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <h2>Feedback should arrive ready to act on.</h2>
        </div>
        <a className={styles.ctaButton} href="/login">
          Open Filika
          <ArrowRight aria-hidden="true" />
        </a>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <FilikaBrand href="/" label="Filika home" className={styles.logo} />
          <p>User-reviewed feedback infrastructure for AI agents.</p>
          <div>
            <a href="#product">Product</a>
            <a href="#safety">Safety</a>
            <a href="https://github.com/Complaintr/filika" rel="noreferrer" target="_blank">
              GitHub
            </a>
          </div>
        </div>

        <div className={styles.brandWatermark} aria-hidden="true">
          <span>filika</span>
        </div>
      </footer>
    </main>
  );
}
