import {
  ArrowRight,
  Check,
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
    copy: "Capture the problem, expected behavior, reproduction steps, and useful technical context in one report.",
  },
  {
    icon: Code2,
    title: "Context that reaches the code",
    copy: "Help maintainers move from a user-visible issue to the relevant route, component, or source location.",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed before it leaves",
    copy: "The user sees and approves every agent-authored report before Filika sends anything.",
  },
];

const workflow = [
  {
    step: "01",
    label: "Notice",
    title: "An agent reaches a blocker.",
    copy: "A broken interaction, confusing flow, missing state, or product idea appears while the agent is working.",
    icon: CircleAlert,
  },
  {
    step: "02",
    label: "Review",
    title: "Filika prepares a precise report.",
    copy: "WebMCP gives the agent a structured path to draft what happened and attach only the context that matters.",
    icon: MousePointer2,
  },
  {
    step: "03",
    label: "Resolve",
    title: "Maintainers receive something actionable.",
    copy: "The approved report arrives ready to triage, with a clear trail back to the affected product surface and code.",
    icon: GitPullRequestArrow,
  },
];

function FilikaMark() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <span className={styles.markSail} />
      <span className={styles.markSailSmall} />
      <span className={styles.markHull} />
    </span>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page} id="app-content">
      <section className={styles.hero}>
        <div className={styles.heroTexture} aria-hidden="true" />
        <header className={styles.header}>
          <a className={styles.logo} href="/" aria-label="Filika home">
            <FilikaMark />
            <span>filika</span>
          </a>

          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#workflow">How it works</a>
            <a href="#safety">Safety</a>
          </nav>

          <div className={styles.headerActions}>
            <a className={styles.signInLink} href="/login">
              Sign in
            </a>
            <a className={styles.headerButton} href="/login">
              Open workspace
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </header>

        <div className={styles.heroCopy}>
          <a className={styles.eyebrow} href="#workflow">
            WebMCP-native feedback infrastructure
            <ArrowRight aria-hidden="true" />
          </a>
          <h1>Turn agent friction into feedback your team can ship.</h1>
          <p>
            Filika helps AI agents report bugs, blockers, and product feedback with the context
            maintainers need, down to the relevant code, after the user reviews every word.
          </p>
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
          <p className={styles.heroNote}>
            <Check aria-hidden="true" /> Open source · User-reviewed · Built on WebMCP
          </p>
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

      <section className={styles.introSection} aria-labelledby="intro-title">
        <p className={styles.sectionKicker}>A better feedback loop</p>
        <h2 id="intro-title">
          The useful details should arrive with the report, not three meetings later.
        </h2>
        <p>
          Filika connects the moment an agent encounters friction to the place maintainers already
          work. It keeps the report structured, scoped, and human-approved.
        </p>
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
          <p className={styles.sectionKicker}>From friction to fix</p>
          <h2 id="workflow-title">A feedback path designed for people and agents.</h2>
          <p>
            No black box. No ambient page collection. Just a clear sequence with the user in
            control.
          </p>
        </div>

        <div className={styles.workflowGrid}>
          {workflow.map(({ step, label, title, copy, icon: Icon }) => (
            <article key={step} className={styles.workflowCard}>
              <div className={styles.workflowTopline}>
                <span>{step}</span>
                <Icon aria-hidden="true" />
              </div>
              <p className={styles.workflowLabel}>{label}</p>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.safetySection} id="safety" aria-labelledby="safety-title">
        <div className={styles.safetyCopy}>
          <p className={styles.sectionKicker}>Human control is the protocol</p>
          <h2 id="safety-title">Nothing is transmitted before the user confirms it.</h2>
          <p>
            Filika provides the feedback workflow, not the AI assistant. Agents draft through a
            bounded WebMCP tool, users review the result, and maintainers receive only what was
            approved.
          </p>
          <a href="https://github.com/Complaintr/filika" rel="noreferrer" target="_blank">
            Explore the open-source protocol <ArrowRight aria-hidden="true" />
          </a>
        </div>

        <div className={styles.safetyChecklist}>
          <div>
            <Check aria-hidden="true" />
            <span>
              <strong>Explicit review</strong>
              Users can edit or cancel every draft.
            </span>
          </div>
          <div>
            <Check aria-hidden="true" />
            <span>
              <strong>Bounded context</strong>
              Only relevant, structured fields enter the report.
            </span>
          </div>
          <div>
            <Check aria-hidden="true" />
            <span>
              <strong>Graceful fallback</strong>
              Manual feedback remains available without an agent.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <p className={styles.sectionKicker}>Build a shorter path to the fix</p>
          <h2>Feedback should arrive ready to act on.</h2>
        </div>
        <a className={styles.ctaButton} href="/login">
          Open Filika
          <ArrowRight aria-hidden="true" />
        </a>
      </section>

      <footer className={styles.footer}>
        <a className={styles.logo} href="/" aria-label="Filika home">
          <FilikaMark />
          <span>filika</span>
        </a>
        <p>User-reviewed feedback infrastructure for AI agents.</p>
        <div>
          <a href="#product">Product</a>
          <a href="#safety">Safety</a>
          <a href="https://github.com/Complaintr/filika" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
