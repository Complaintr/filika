import { describe, expect, test } from "bun:test";

const appDirectory = `${import.meta.dir}/../app`;

describe("public landing page", () => {
  test("positions Filika as user-reviewed WebMCP feedback infrastructure", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain("Turn agent friction into feedback your team can ship.");
    expect(page).toContain("AI agents report bugs, blockers, and product feedback");
    expect(page).toContain("down to the relevant code");
    expect(page).toContain("the user reviews every word");
    expect(page).toContain("Nothing is transmitted before the user confirms it.");
  });

  test("keeps a dedicated surface for the future interactive widget", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain("Reserved product surface");
    expect(page).toContain("Interactive widget preview");
    expect(page).toContain("This area is ready for the real Filika widget.");
    expect(page).toContain("Nothing is sent yet");
  });

  test("pairs agent signals with maintainer-ready reviewed reports", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();
    const flow = await Bun.file(
      `${import.meta.dir}/../src/components/realtime-flow-board.tsx`,
    ).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(page).toContain("Evidence, not noise");
    expect(page).toContain("<RealtimeFlowBoard");
    expect(flow).toContain("What agents notice");
    expect(flow).toContain("What maintainers receive");
    expect(flow).toContain("Ready for triage");
    expect(flow).toContain("User reviewed");
    expect(flow).toContain("Duplicate-safe");
    expect(styles).toContain('.reportCard[data-tone="aqua"]');
    expect(styles).toContain('.reportCard[data-tone="violet"]');
    expect(styles).toContain('.reportCard[data-tone="peach"]');
  });

  test("offers workspace and source calls to action", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain('href="/login"');
    expect(page).toContain('href="https://github.com/Complaintr/filika"');
    expect(page).toContain('rel="noreferrer"');
  });

  test("serves the home route without authentication or workspace chrome", async () => {
    const proxy = await Bun.file(`${import.meta.dir}/../proxy.ts`).text();
    const shell = await Bun.file(`${import.meta.dir}/../src/workspace/auth-aware-shell.tsx`).text();

    expect(proxy).toContain('pathname === "/"');
    expect(shell).toContain('"/",');
    expect(shell).toContain('"/login",');
    expect(shell).toContain('"/onboarding",');
  });

  test("includes the theme switcher in the header actions with dark mode styles", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();
    const header = await Bun.file(`${import.meta.dir}/../src/components/landing-header.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(page).toContain("<LandingHeader");
    expect(header).toContain("<ThemeSwitcher");
    expect(styles).toContain(".themeSwitcher");
    expect(styles).toContain(':root[data-theme="dark"] .page');
    expect(styles).toContain(':root[data-theme="dark"] .productStage');
    expect(styles).toContain(':root[data-theme="dark"] .ctaSection');
  });

  test("uses numbered badges for safety steps and includes brand watermark", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(page).toContain("01");
    expect(page).toContain("02");
    expect(page).toContain("03");
    expect(page).toContain("brandWatermark");
    expect(styles).toContain(".safetyIndex");
    expect(styles).toContain(".brandWatermark");
    expect(styles).toContain(".headerScrolled");
  });
});
