import { describe, expect, test } from "bun:test";

const appDirectory = `${import.meta.dir}/../app`;

describe("public landing page", () => {
  test("positions Filika as user-reviewed WebMCP feedback infrastructure", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain("Turn agent friction into feedback your team can ship.");
    expect(page).toContain("AI agents report bugs, blockers, and product feedback");
    expect(page).toContain("down to the relevant code");
    expect(page).toContain("after the user reviews every word");
    expect(page).toContain("Filika provides the feedback workflow, not the AI assistant");
  });

  test("keeps a dedicated surface for the future interactive widget", async () => {
    const page = await Bun.file(`${appDirectory}/page.tsx`).text();

    expect(page).toContain("Reserved product surface");
    expect(page).toContain("Interactive widget preview");
    expect(page).toContain("This area is ready for the real Filika widget.");
    expect(page).toContain("Nothing is sent yet");
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
    expect(shell).toContain('new Set(["/", "/login"])');
  });
});
