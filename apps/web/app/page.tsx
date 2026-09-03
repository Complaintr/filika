import { ArrowRight, Bot, Bug, ChevronDown, Layers, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ResolutionFlowDemo, SiteScanFlowDemo } from "@/components/animated-beam-demo";
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
    "Filika is an open-source, 100% free WebMCP feedback platform. Browser AI agents report bugs, blocked tasks, and confusing UX directly to your developer inbox.",
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
] as const;

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
        </section>

        <section className={styles.finalCta}>
          <div className={styles.finalCtaMain}>
            <h2>
              Find code and behavioral bugs before your users do.{" "}
              <span>100% Free &amp; Open Source.</span>
            </h2>
            <a className={styles.primaryButton} href="/login">
              Get Started <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <p className={styles.finalCtaCopyright}>&copy; 2026 Complaintr. All rights reserved.</p>
        </section>
      </main>

      <footer className={styles.bottomWatermark}>
        <div className={styles.footerTop}>
          <FilikaBrand href="/" label="Filika home" className={styles.footerBrand} />
          <p>WebMCP feedback infrastructure for modern web applications.</p>
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="https://github.com/Complaintr/filika" rel="noreferrer" target="_blank">
              GitHub
            </a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
        <span className={styles.bottomWatermarkText} aria-hidden="true">
          filika
        </span>
      </footer>
    </div>
  );
}
