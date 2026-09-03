import { describe, expect, test } from "bun:test";

const appDirectory = `${import.meta.dir}/../app`;

describe("public landing page", () => {
  test("describes automatic and manual issue creation without claiming code access", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toMatch(/reviewed GitHub issues\s*<br \/>/);
    expect(page).toContain("Reports reach your collector immediately");
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
      "Start collecting agent-authored feedback today.",
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
    expect(page).toContain("From code errors to broken user flows.");
    expect(page).toContain("2026 Complaintr. All rights reserved.");
    expect(page).toContain("WebMCP feedback infrastructure for modern web applications.");
    expect(page).toContain('href="/terms"');
    expect(page).toContain("Maintainer triage");
    expect(page).toContain("What is Filika?");
    expect(page).toContain("How do WebMCP agents find bugs?");
    expect(page).toContain("How do I connect Filika to my website?");
    expect(page).toContain("How is user privacy protected?");
    expect(page).toContain("Can I self-host Filika?");
    expect(page).not.toContain("Is Filika completely free?");
    expect(page.toLowerCase()).not.toContain("sdk");
    expect(featureDemos.toLowerCase()).not.toContain("sdk");

    // Footer and FAQ contact details
    expect(page).toContain('href="mailto:filika@complaintr.com"');
    expect(page).toContain("Filika is a product of Complaintr.");
    expect(page).toContain("Still have questions? Email");

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

    expect(page).toContain("<LandingDashboardDemo />");
    expect(page).not.toContain("Widget Area");
    expect(styles).toContain("--primary: #009fe3");
    expect(styles.match(/--primary: #009fe3/g)).toHaveLength(2);
    expect(styles).toContain(".headerWrapper");
    expect(styles).toContain(".headerScrolled");
    expect(styles).toContain(".themeSwitcher");
    const headerLeft = styles.match(/\.headerLeft\s*\{([^}]*)\}/)?.[1];
    const navLink = styles.match(/\.nav a\s*\{([^}]*)\}/)?.[1];
    expect(headerLeft).toContain("align-items: center");
    expect(headerLeft).toContain("height: 100%");
    expect(navLink).toContain("height: 22px");
    expect(navLink).toContain("line-height: 1");
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
    expect(styles).toContain(".dashboardDemo");
    expect(page).toContain("<SiteScanFlowDemo />");
    expect(page).toContain("<ResolutionFlowDemo />");
    expect(page).toContain("<GlobeDemo />");
    expect(page).not.toContain("<AnimatedBeamDemo />");
    expect(flowDemos).not.toContain("scanBrowserHeader");
    expect(styles).toContain(".scanBrowserBody");
    expect(styles).toContain("height: 100%;");
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

  test("frames the hero demo with the demo frame asset and a theme-aware fallback", async () => {
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    const heroMedia = styles.match(/\.heroMedia\s*\{([^}]*)\}/)?.[1];
    expect(heroMedia).toContain('var(--card) url("/hero-demo-frame.png")');
    expect(styles).toContain("/hero-demo-frame.png");

    const darkHeroMedia = styles.match(
      /:root\[data-theme="dark"\]\s+\.heroMedia\s*\{([^}]*)\}/,
    )?.[1];
    expect(darkHeroMedia).toContain("rgba(10, 15, 26, 0.58)");
    expect(darkHeroMedia).toContain("/hero-demo-frame.png");
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
