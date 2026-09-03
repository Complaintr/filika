import { ArrowRight, Bot, Bug, ChevronDown, Layers, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ResolutionFlowDemo, SiteScanFlowDemo } from "@/components/animated-beam-demo";
import { ContactLink } from "@/components/contact-dialog";
import { FilikaBrand } from "@/components/filika-brand";
import { LandingDashboardDemo } from "@/components/landing-dashboard-demo";
import { LandingHeader } from "@/components/landing-header";
import styles from "./landing.module.css";
import {
  ApprovalFlowDemo,
  BugAnalyticsDemo,
  DiscoveryDashboardDemo,
  GlobeDemo,
  IntegrationHealthDemo,
} from "./landing-feature-demos";

export const metadata: Metadata = {
  title: {
    absolute: "Filika",
  },
  description:
    "Filika is an open-source WebMCP feedback platform. Browser AI agents report bugs, blocked tasks, and confusing UX directly to your developer inbox.",
};

const extras = [
  ["WebMCP Protocol", "Native browser tool integration built on document.modelContext standards."],
  ["Code Context", "Captures route labels, release versions, and reproduction steps."],
  [
    "Behavioral Detection",
    "Captures confusing interaction loops, dead-end states, and blocked workflows.",
  ],
  [
    "Self-Hostable",
    "Deploy on your own infrastructure with Bun and PostgreSQL for full data control.",
  ],
  [
    "Developer Triage Workspace",
    "Filter, search, and manage incoming bug reports in a unified inbox.",
  ],
  [
    "Privacy by Default",
    "Zero ambient capture. No cookies, no passwords, no browsing history, and no tracking.",
  ],
] as const;

const faqs = [
  [
    "What is Filika?",
    "Filika is an open-source, WebMCP-native feedback system. Browser AI agents draft structured reports about issues they encounter, and maintainers triage them in one place.",
  ],
  [
    "How do WebMCP agents find bugs?",
    "When a WebMCP-enabled browser agent interacts with your website, it uses the filika_submit_feedback tool to report bugs, blocked tasks, and confusing UX with reproduction steps.",
  ],
  [
    "How do I connect Filika to my website?",
    "Add the lightweight script tag to your web pages and approve your website origin in Filika settings. The tool registers with document.modelContext automatically.",
  ],
  [
    "How is user privacy protected?",
    "Filika enforces zero ambient capture: no cookies, passwords, browsing history, or session storage. Reports contain only the explicit evidence drafted by the agent.",
  ],
  [
    "Can I self-host Filika?",
    "Yes. Both the WebMCP collector and web workspace are open source and easy to self-host with Bun and PostgreSQL on your own servers.",
  ],
  ["Is Filika open source?", openSourceAnswer()],
] as const;

function openSourceAnswer() {
  return (
    <>
      Yes. Filika is open source and the full codebase is public. You can{" "}
      <a href="https://github.com/Complaintr/filika" target="_blank" rel="noreferrer">
        browse it on GitHub
      </a>
      .
    </>
  );
}

function SectionTitle({ children, muted }: { children: React.ReactNode; muted: React.ReactNode }) {
  return (
    <h2 className={styles.sectionTitle}>
      {children} <span>{muted}</span>
    </h2>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page} id="app-content">
      <LandingHeader />

      <main className={styles.main}>
        <section className={styles.hero} data-landing-hero>
          <div className={styles.heroGrid}>
            <h1>
              Turn agent-found bugs into reviewed GitHub issues
              <br />
              <span>with WebMCP.</span>
            </h1>
            <div className={styles.heroPitch}>
              <p>
                Filika gives browser agents a WebMCP tool to report problems they encounter in your
                web app. Reports reach your collector immediately, where Filika can create a GitHub
                issue automatically or let your team create it manually.
              </p>
              <div className={styles.heroCta}>
                <a className={styles.primaryButton} href="/login">
                  Get Started <ArrowRight aria-hidden="true" />
                </a>
                <a className={styles.secondaryButton} href="/demo">
                  Demo
                </a>
              </div>
            </div>
          </div>
          <div className={styles.heroMedia}>
            <LandingDashboardDemo />
          </div>
        </section>

        <section className={styles.section} id="how-it-works">
          <SectionTitle muted="in three safe steps.">
            From agent discovery to resolution,
          </SectionTitle>
          <ol className={styles.steps}>
            <li className={styles.installStep}>
              <div className={styles.cardHeading}>
                <h3>Connect in seconds</h3>
              </div>
              <div className={styles.stepVisual}>
                <GlobeDemo />
              </div>
              <p>Embed the lightweight script snippet and verify your domain in seconds.</p>
            </li>
            <li>
              <div className={styles.cardHeading}>
                <h3>Agents detect issues</h3>
              </div>
              <div className={styles.stepVisual}>
                <SiteScanFlowDemo />
              </div>
              <p>Browser agents detect blockers and submit structured reports instantly.</p>
            </li>
            <li>
              <div className={styles.cardHeading}>
                <h3>Review and resolve</h3>
              </div>
              <div className={styles.stepVisual}>
                <ResolutionFlowDemo />
              </div>
              <p>Inspect incoming reports and triage them in your unified inbox.</p>
            </li>
          </ol>
        </section>

        <section className={styles.section} id="features">
          <SectionTitle muted="Everything you need.">
            Built for intelligent agent workflows.
          </SectionTitle>
          <ul className={styles.featureGrid}>
            <li>
              <DiscoveryDashboardDemo />
              <h3>
                <Bot aria-hidden="true" /> WebMCP native
              </h3>
              <p>
                Exposes standard browser tools for AI agents to draft structured bug reports on the
                fly.
              </p>
            </li>
            <li>
              <BugAnalyticsDemo />
              <h3>
                <Bug aria-hidden="true" /> Code &amp; behavioral bugs
              </h3>
              <p>
                Structured capture for bugs, blocked tasks, confusing behavior, and feature ideas.
              </p>
            </li>
            <li>
              <IntegrationHealthDemo />
              <h3>
                <Layers aria-hidden="true" /> Seamless integrations
              </h3>
              <p>Works with standard web frameworks, browser agents, and PostgreSQL databases.</p>
            </li>
            <li>
              <ApprovalFlowDemo />
              <h3>
                <ShieldCheck aria-hidden="true" /> Maintainer triage
              </h3>
              <p>
                Triage incoming reports in a unified workspace and export issues directly to GitHub.
              </p>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <SectionTitle muted="and none of it costs anything.">
            Complete feedback infrastructure,
          </SectionTitle>
          <ul className={styles.extras}>
            {extras.map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <SectionTitle muted="straight answers.">Fair questions,</SectionTitle>
          <div className={styles.faqs}>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
          <p className={styles.faqsContact}>
            Still have questions? Email{" "}
            <a href="mailto:filika@complaintr.com">filika@complaintr.com</a>.
          </p>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.finalCtaMain}>
            <h2>
              Start collecting agent-authored feedback today.{" "}
              <span>From code errors to broken user flows.</span>
            </h2>
            <div className={styles.finalCtaActions}>
              <a
                className={styles.secondaryButton}
                href="https://github.com/Complaintr/filika"
                rel="noreferrer"
                target="_blank"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.51 2.87 8.34 6.84 9.69.5.1.68-.22.68-.5v-1.73c-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.1-1.5-1.1-1.5-.91-.63.06-.62.06-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .28.18.6.69.5A10.15 10.15 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
                <span>GitHub</span>
              </a>
              <a className={styles.primaryButton} href="/login">
                Get Started <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>
          <p className={styles.finalCtaCopyright}>&copy; 2026 Complaintr. All rights reserved.</p>
        </section>
      </main>

      <footer className={styles.bottomWatermark}>
        <div className={styles.footerTop}>
          <FilikaBrand href="/" label="Filika home" className={styles.footerBrand} />
          <p>WebMCP feedback infrastructure for modern web applications.</p>
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <a href="https://github.com/Complaintr/filika" rel="noreferrer" target="_blank">
              GitHub
            </a>
            <ContactLink />
            <a href="/terms">Terms</a>
          </nav>
        </div>
        <p className={styles.footerAttribution}>
          Filika is a product of{" "}
          <a href="https://complaintr.com" target="_blank" rel="noreferrer">
            Complaintr
          </a>
          .
        </p>
        <span className={styles.bottomWatermarkText} aria-hidden="true">
          filika
        </span>
      </footer>
    </div>
  );
}
