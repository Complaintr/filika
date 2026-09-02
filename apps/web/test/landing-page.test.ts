import { describe, expect, test } from "bun:test";

const appDirectory = `${import.meta.dir}/../app`;

describe("public landing page", () => {
  test("describes automatic and manual issue creation without claiming code access", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toMatch(/reviewed GitHub issues\s*<br \/>/);
    expect(page).toContain("After the user reviews and confirms a report");
    expect(page).toContain("issue automatically or let your team create it manually");
    expect(page).not.toContain("connects each reviewed report to the relevant code");
  });

  test("renders the Filika landing content and sections in their intended order", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    const sections = [
      "Turn agent-found bugs into reviewed GitHub issues",
      "From agent discovery to resolution,",
      "Built for intelligent agent workflows.",
      "Complete feedback infrastructure,",
      "Fair questions,",
      "Find code and behavioral bugs before your users do.",
    ];

    for (const section of sections) {
      expect(page).toContain(section);
    }

    const positions = sections.map((section) => page.indexOf(section));
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  test("uses the official Filika brand logo and external links", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();
    const header = await Bun.file(`${import.meta.dir}/../src/components/landing-header.tsx`).text();

    expect(page).toContain("<LandingHeader");
    expect(header).toContain("<FilikaBrand");
    expect(header).toContain('href="/login"');
    expect(header).toContain('href="https://github.com/Complaintr/filika"');
    expect(header).toContain("Get Started");
    expect(header).toContain("<ThemeSwitcher");
  });

  test("includes WebMCP, bug discovery, extras, and FAQ data", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();
    const featureDemos = await Bun.file(`${appDirectory}/landing-feature-demos.tsx`).text();

    expect(page).toContain("WebMCP native");
    expect(page).toContain("Code &amp; behavioral bugs");
    expect(page).toContain("100% Free &amp; Open Source");
    expect(page).toContain("2026 Complaintr. All rights reserved.");
    expect(page).toContain("User-reviewed feedback infrastructure for AI agents.");
    expect(page).toContain('href="/terms"');
    expect(page).toContain("Human in the loop");
    expect(page).toContain("What is Filika?");
    expect(page).toContain("How do WebMCP agents find bugs?");
    expect(page).toContain("How do I connect Filika to my website?");
    expect(page).toContain("How is user privacy protected?");
    expect(page).toContain("Can I self-host Filika?");
    expect(page).not.toContain("Is Filika completely free?");
    expect(page.toLowerCase()).not.toContain("sdk");
    expect(featureDemos.toLowerCase()).not.toContain("sdk");

    // Extras section items
    expect(page).toContain("WebMCP Protocol");
    expect(page).toContain("Code Context");
    expect(page).toContain("Behavioral Detection");
    expect(page).toContain("Self-Hostable");
    expect(page).toContain("Developer Triage Workspace");
    expect(page).toContain("Privacy by Default");
    expect(page).not.toContain("Zero Performance Impact");
    expect(page).not.toContain("Manual Feedback Mode");
    expect(page).not.toContain("Safe Data Sanitization");
  });

  test("matches the light visual system and responsive composition", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();
    const flowDemos = await Bun.file(
      `${import.meta.dir}/../src/components/animated-beam-demo.tsx`,
    ).text();
    const globeDemo = await Bun.file(
      `${import.meta.dir}/../src/components/world-globe-demo.tsx`,
    ).text();
    const featureDemos = await Bun.file(`${appDirectory}/landing-feature-demos.tsx`).text();

    expect(page).toContain("<WidgetPreview />");
    expect(page).not.toContain("Widget Area");
    expect(styles).toContain("--primary: #009fe3");
    expect(styles.match(/--primary: #009fe3/g)).toHaveLength(2);
    expect(styles).toContain(".headerWrapper");
    expect(styles).toContain(".headerScrolled");
    expect(styles).toContain(".themeSwitcher");
    expect(styles).toContain("line-height: 1.2");
    expect(styles).toContain("align-items: flex-start");
    expect(styles).toContain("align-self: flex-start");
    expect(styles).toContain("padding-bottom: 0.1em");
    expect(styles).toContain("overflow: visible");
    expect(styles).toContain("background: var(--primary)");
    expect(styles).toContain("box-shadow: none");
    expect(styles).not.toContain("primary-gradient");
    expect(styles).not.toContain("#0081c3");
    expect(styles).not.toContain("#38d6ff");
    expect(styles).not.toContain("rgba(0, 136, 204");
    expect(styles).not.toContain("rgba(56, 189, 248");
    expect(styles).not.toContain("rgba(48, 93, 222");
    expect(styles).toContain("grid-template-columns: repeat(3, 1fr)");
    expect(styles).toContain("@media (max-width: 560px)");
    expect(styles).toContain(".widgetArea");
    expect(page).toContain("<SiteScanFlowDemo />");
    expect(page).toContain("<ResolutionFlowDemo />");
    expect(page).toContain("<GlobeDemo />");
    expect(page).not.toContain("<AnimatedBeamDemo />");
    expect(featureDemos).toContain("WorldGlobeDemo");
    expect(styles).toContain(".globeContainer");
    expect(styles).toContain(".globeCanvas");
    expect(globeDemo).toContain("GLOBE_RADIUS_SCALE = 0.4");
    expect(flowDemos).toContain("WebMCP agent scanning the website");
    expect(flowDemos).toContain("Website under agent inspection");
    expect(flowDemos).toContain('data-site-scanner="true"');
    expect(flowDemos).toContain("Unified review inbox");
    expect(flowDemos.match(/<FlowBeamPath/g)).toHaveLength(7);
  });

  test("defines status color tokens for both light and dark themes", async () => {
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    for (const token of ["--success: #16a34a", "--warning: #d97706", "--error: #dc2626"]) {
      expect(styles.match(new RegExp(token, "g"))).toHaveLength(2);
    }
    expect(styles).toContain("--success-soft: rgba(22, 163, 74, 0.08)");
    expect(styles).toContain("--warning-soft: rgba(217, 119, 6, 0.1)");
  });

  test("widget preview shell carries the header status strip", async () => {
    const widget = await Bun.file(`${import.meta.dir}/../src/components/widget-preview.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(widget).toContain("export function WidgetPreview");
    expect(widget).toContain("WebMCP connected");
    expect(widget).toContain("Browser agent found a possible issue");
    expect(widget).not.toContain("—");
    expect(widget.toLowerCase()).not.toContain("sdk");
    for (const className of [
      ".widgetSurface",
      ".widgetHeader",
      ".widgetBrand",
      ".widgetStatus",
      ".widgetHelper",
    ]) {
      expect(styles).toContain(className);
    }
  });

  test("widget preview shows the agent issue discovery card", async () => {
    const widget = await Bun.file(`${import.meta.dir}/../src/components/widget-preview.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(widget).toContain("checkout.example");
    expect(widget).toContain("Broken flow detected");
    expect(widget).toContain("Checkout button does not respond after address validation.");
    expect(widget).toContain("Route: /checkout");
    expect(widget).toContain("Severity: Medium");
    expect(widget).not.toContain("—");
    for (const className of [
      ".widgetDiscovery",
      ".widgetSitePreview",
      ".widgetBrokenTag",
      ".widgetObservation",
      ".widgetChips",
    ]) {
      expect(styles).toContain(className);
    }
  });

  test("widget preview flow shows the agent draft stage", async () => {
    const widget = await Bun.file(`${import.meta.dir}/../src/components/widget-preview.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(widget).toContain("Draft report");
    expect(widget).toContain("Checkout cannot be completed");
    expect(widget).toContain(
      "The payment step remains unavailable after valid address details are entered.",
    );
    expect(widget).toContain("Prepared by browser agent");
    expect(widget).not.toContain("—");
    for (const className of [
      ".widgetFlow",
      ".widgetStage",
      ".widgetStageNode",
      ".widgetDraft",
      ".widgetDraftBy",
    ]) {
      expect(styles).toContain(className);
    }
  });

  test("widget preview flow centers the user review stage", async () => {
    const widget = await Bun.file(`${import.meta.dir}/../src/components/widget-preview.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(widget).toContain("User review");
    expect(widget).toContain("Review before sending");
    expect(widget).toContain("You control what gets shared.");
    expect(widget).toContain("Edit report");
    expect(widget).toContain("Review &amp; confirm");
    expect(widget).toContain("ShieldCheck");
    expect(widget).not.toContain("—");
    for (const className of [
      ".widgetReview",
      ".widgetReviewPrimary",
      ".widgetReviewSecondary",
      ".widgetStageNodeActive",
    ]) {
      expect(styles).toContain(className);
    }
  });

  test("widget preview flow ends at the triage receipt", async () => {
    const widget = await Bun.file(`${import.meta.dir}/../src/components/widget-preview.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(widget).toContain("Ready for triage");
    expect(widget).toContain("Report confirmed");
    expect(widget).toContain("Sent to your Filika inbox");
    expect(widget).toContain("Issue ready for review");
    expect(widget).toContain("GithubIcon");
    expect(widget).not.toContain("—");
    for (const className of [".widgetReceipt", ".widgetReceiptCheck", ".widgetGithub"]) {
      expect(styles).toContain(className);
    }
  });

  test("widget preview animates the flow and supports clickable confirm", async () => {
    const widget = await Bun.file(`${import.meta.dir}/../src/components/widget-preview.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(widget).toContain("useState");
    expect(widget).toContain("onClick={() => setConfirmed(true)}");
    expect(widget).toContain("widgetConfirmed");
    expect(widget).toContain("widgetReceiptConfirmed");
    expect(widget).not.toContain("—");
    for (const keyframe of [
      "@keyframes widgetPulse",
      "@keyframes widgetDraftEmphasis",
      "@keyframes widgetButtonGlow",
      "@keyframes widgetConfirmPop",
    ]) {
      expect(styles).toContain(keyframe);
    }
    expect(styles).not.toContain("widgetReceiptEmphasis");
    expect(styles).not.toContain("widgetCheckPop");
    expect(styles).not.toContain("rgba(22, 163, 74, 0.35)");
    expect(styles).toContain(".widgetReceiptConfirmed .widgetReceiptCheck");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".widgetReviewActions button:focus-visible");
  });

  test("serves the home route without authentication or workspace chrome", async () => {
    const proxy = await Bun.file(`${import.meta.dir}/../proxy.ts`).text();
    const shell = await Bun.file(`${import.meta.dir}/../src/workspace/auth-aware-shell.tsx`).text();

    expect(proxy).toContain('pathname === "/"');
    expect(shell).toContain('"/",');
    expect(shell).toContain('"/login",');
    expect(shell).toContain('"/onboarding",');
  });
});
