import { describe, expect, test } from "bun:test";

const appDirectory = `${import.meta.dir}/../app`;

describe("public landing page", () => {
  test("renders the Filika landing content and sections in their intended order", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    const sections = [
      "Open-source bug discovery",
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
    const featureDemos = await Bun.file(`${appDirectory}/landing-feature-demos.tsx`).text();

    expect(page).toContain("Widget Area");
    expect(styles).toContain("--primary: #009fe3");
    expect(styles.match(/--primary: #009fe3/g)).toHaveLength(2);
    expect(styles).toContain(".headerWrapper");
    expect(styles).toContain(".headerScrolled");
    expect(styles).toContain(".themeSwitcher");
    expect(styles).toContain("line-height: 1.2");
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
    expect(flowDemos).toContain("WebMCP agent scanning the website");
    expect(flowDemos).toContain("Website under agent inspection");
    expect(flowDemos).toContain('data-site-scanner="true"');
    expect(flowDemos).toContain("Unified review inbox");
    expect(flowDemos.match(/<FlowBeamPath/g)).toHaveLength(7);
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
