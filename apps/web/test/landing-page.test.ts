import { describe, expect, test } from "bun:test";

const appDirectory = `${import.meta.dir}/../app`;

describe("public landing page", () => {
  test("positions Filika as user-reviewed WebMCP feedback infrastructure", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain("Turn agent friction into feedback your team can ship.");
    expect(page).toContain("User-reviewed agent feedback, linked directly to code.");
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

    expect(page).toContain("See the signal. Ship the fix.");
    expect(page).toContain("<RealtimeFlowBoard");
    expect(flow).toContain("What agent sees");
    expect(flow).toContain("What user sees");
    expect(flow).toContain("User reviewed");
    expect(flow).not.toContain("User verification gate");
    expect(flow).not.toContain("Zero ambient data · Approved");
    expect(flow).not.toContain("agent_session.log");
    expect(flow).not.toContain("Agent signals");
    expect(flow).not.toContain("Reviewed reports");
    expect(flow).not.toContain("Observed bug");
    expect(flow).not.toContain("Live stream");
    expect(flow).not.toContain("Ready for triage");
    expect(flow).not.toContain("Maintainer workspace");
    expect(flow).not.toContain("checkout-form.tsx");
    expect(styles).toContain('.reportCard[data-tone="aqua"]');
    expect(styles).toContain('.reportCard[data-tone="violet"]');
    expect(styles).toContain('.reportCard[data-tone="peach"]');
  });

  test("keeps the live report board readable on narrow mobile screens", async () => {
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();

    expect(styles).toContain("padding: 4px 10px;");
    expect(styles).toContain(".reportBoardSection {\n    width: calc(100% - 20px);");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(styles).toContain(".badgeTime,\n  .statusOpen,\n  .statusResolved");
  });

  test("offers workspace and source calls to action", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain('href="/login"');
    expect(page).toContain('href="https://github.com/Complaintr/filika"');
    expect(page).toContain('rel="noreferrer"');
  });

  test("uses a publicly accessible hero background image", async () => {
    const styles = await Bun.file(`${appDirectory}/landing.module.css`).text();
    const heroImage = Bun.file(`${appDirectory}/landing-hero-coast.png`);

    expect(styles).toContain('url("./landing-hero-coast.png")');
    expect(await heroImage.exists()).toBe(true);
    expect(heroImage.size).toBeGreaterThan(0);
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
