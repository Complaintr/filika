import {
  ArrowRight,
  Bot,
  Bug,
  ChevronDown,
  Circle,
  Layers,
  Lock,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing-header";
import { AnimatedBeamDemo } from "@/components/animated-beam-demo";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Filika — Open Source WebMCP Agentic Bug Discovery Platform",
  description:
    "Filika is an open-source, 100% free platform that uses WebMCP browser agents to discover code crashes, runtime exceptions, and behavioral bugs in web applications.",
};

const sampleBugs = [
  {
    type: "Observed Bug",
    path: "/checkout",
    title: "Uncaught TypeError in promo apply",
    tag: "Code Error",
  },
  {
    type: "Blocked Task",
    path: "/onboarding",
    title: "Step 2 Next button remains disabled",
    tag: "Behavioral",
  },
  {
    type: "Confusing Behavior",
    path: "/settings/team",
    title: "Role toggle reverts without warning",
    tag: "UX Flow",
  },
  { type: "Concrete Idea", path: "/inbox", title: "Filter by agent session ID", tag: "Feature" },
] as const;

const extras = [
  ["WebMCP Protocol", "Native browser tool integration built on document.modelContext standards."],
  ["Code Context", "Captures stack traces, runtime exceptions, and failed network calls."],
  [
    "Behavioral Detection",
    "Spots confusing interaction loops, dead-end states, and broken UI controls.",
  ],
  [
    "Self-Hostable",
    "Deploy on your own infrastructure with Bun and PostgreSQL for full data control.",
  ],
  [
    "Developer Triage Workspace",
    "Filter, search, and manage verified bug reports in a unified inbox.",
  ],
  [
    "Privacy by Default",
    "Automatically strips credentials and tokens before review. No cookies, no tracking, and no ambient recording.",
  ],
] as const;

const faqs = [
  [
    "What is Filika?",
    "Filika is an open-source platform that uses WebMCP browser agents to discover code errors, runtime bugs, and behavioral issues across web applications.",
  ],
  [
    "How do WebMCP agents find bugs?",
    "When a WebMCP-enabled browser agent interacts with your website, it uses structured tools to inspect runtime state, detect broken flows, and draft detailed reports on problems it encounters.",
  ],
  [
    "How do I install Filika on my website?",
    "Add one lightweight <script> tag to your HTML or install the @filika/sdk package. It registers WebMCP tools in milliseconds with zero configuration.",
  ],
  [
    "How is user privacy protected?",
    "Nothing is sent without user review and confirmation. Filika never records cookies, passwords, browsing history, or ambient session data.",
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
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div>
              <h1>
                Open-source bug discovery <span>powered by WebMCP agents</span>
              </h1>
            </div>
            <div className={styles.heroPitch}>
              <p>
                Let browser agents autonomously detect runtime code errors, broken flows, and
                behavioral friction across your apps. Free, open source, and privacy-first.
              </p>
              <div className={styles.heroCta}>
                <a className={styles.primaryButton} href="/login">
                  Get Started <ArrowRight aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
          <div className={styles.heroMedia}>
            <div className={styles.widgetArea}>Widget Area</div>
          </div>
        </section>

        <section className={styles.section} id="how-it-works">
          <SectionTitle muted="in three safe steps.">
            From agent discovery to resolution,
          </SectionTitle>
          <ol className={styles.steps}>
            <li>
              <div className={styles.cardHeading}>
                <span>01</span>
                <h3>Connect in seconds</h3>
              </div>
              <div className={styles.stepVisual}>
                <AnimatedBeamDemo />
              </div>
              <p>One lightweight install with zero build configuration.</p>
            </li>
            <li>
              <div className={styles.cardHeading}>
                <span>02</span>
                <h3>Agents detect issues</h3>
              </div>
              <div className={styles.stepVisual}>
                <div className={styles.installCard}>
                  <h4>Active Inspection</h4>
                  <div className={styles.waiting}>
                    <Radio aria-hidden="true" />
                    <span>Monitoring runtime &amp; behavioral events…</span>
                  </div>
                  <p>
                    WebMCP agents catch exceptions, broken flows, and UI traps as they navigate.
                  </p>
                </div>
              </div>
              <p>
                Browser agents detect runtime crashes, unhandled rejections, and confusing states
                automatically.
              </p>
            </li>
            <li>
              <div className={styles.cardHeading}>
                <span>03</span>
                <h3>Review and resolve</h3>
              </div>
              <div className={styles.stepVisual}>
                <div className={styles.referrers}>
                  <h4>Discovered Reports</h4>
                  {[
                    ["Observed Bug", "Runtime crash in form", "Code"],
                    ["Blocked Task", "Submit button hangs", "Flow"],
                    ["Confusing Behavior", "Dialog closes on click", "UX"],
                    ["Concrete Idea", "Add auto-save draft", "Feature"],
                  ].map((row) => (
                    <div key={row[1]}>
                      <Circle aria-hidden="true" />
                      <span>{row[1]}</span>
                      <b>{row[0]}</b>
                      <small>{row[2]}</small>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                Users review and confirm sanitized reports before sending. Maintainers triage in a
                unified inbox.
              </p>
            </li>
          </ol>
        </section>

        <section className={styles.section} id="features">
          <SectionTitle muted="Everything you need.">
            Built for intelligent agent workflows.
          </SectionTitle>
          <ul className={styles.featureGrid}>
            <li>
              <div className={styles.visitorList}>
                {sampleBugs.map((bug) => (
                  <div key={bug.title}>
                    <span className={styles.avatar} />
                    <b>{bug.type}</b>
                    <code>{bug.path}</code>
                    <small>{bug.tag}</small>
                  </div>
                ))}
              </div>
              <h3>
                <Bot aria-hidden="true" /> WebMCP native
              </h3>
              <p>
                Exposes standard browser tools for AI agents to draft structured bug reports on the
                fly.
              </p>
            </li>
            <li>
              <div className={styles.cookieVisual}>
                <div>Runtime exception &amp; behavior captured without cookies or tracking…</div>
                <button type="button">100% Privacy Preserving</button>
                <Lock aria-hidden="true" />
              </div>
              <h3>
                <Bug aria-hidden="true" /> Code &amp; behavioral bugs
              </h3>
              <p>
                Finds silent runtime exceptions, console errors, broken interactions, and UX
                friction.
              </p>
            </li>
            <li>
              <div className={styles.integrationsVisual}>
                {[
                  ["React & Next.js", "SDK & Script integration", "Active"],
                  ["WebMCP Agent", "Standard document.modelContext", "Connected"],
                  ["PostgreSQL", "Open collector persistence", "Ready"],
                  ["Maintainer Inbox", "Realtime feedback triage", "Live"],
                ].map(([name, detail, action]) => (
                  <div key={name}>
                    <Layers aria-hidden="true" />
                    <span>
                      <b>{name}</b>
                      <small>{detail}</small>
                    </span>
                    <button type="button">{action}</button>
                  </div>
                ))}
              </div>
              <h3>
                <Layers aria-hidden="true" /> Seamless integrations
              </h3>
              <p>Works with standard web frameworks, browser agents, and PostgreSQL databases.</p>
            </li>
            <li>
              <div className={styles.chatVisual}>
                <div>Agent drafted report: Broken checkout step</div>
                <p>
                  <ShieldCheck aria-hidden="true" /> User confirmed: Sent to maintainer inbox
                  without private data.
                </p>
              </div>
              <h3>
                <ShieldCheck aria-hidden="true" /> Human in the loop
              </h3>
              <p>
                No data is sent without explicit user review and confirmation. Safe by construction.
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
          <h2>
            Find code and behavioral bugs before your users do.{" "}
            <span>100% Free &amp; Open Source.</span>
          </h2>
          <a className={styles.primaryButton} href="/login">
            Get Started <ArrowRight aria-hidden="true" />
          </a>
        </section>
      </main>
    </div>
  );
}
