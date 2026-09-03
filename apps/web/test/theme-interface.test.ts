import { expect, test } from "bun:test";

test("the saved theme is applied before the workspace paints", async () => {
  const layout = await Bun.file(`${import.meta.dir}/../app/layout.tsx`).text();
  const bootstrap = await Bun.file(`${import.meta.dir}/../public/theme-bootstrap.js`).text();

  expect(layout).toContain('src="/theme-bootstrap.js"');
  expect(bootstrap).toContain('["light", "dark", "system"].includes(saved.theme)');
  expect(bootstrap).toContain('matchMedia("(prefers-color-scheme: dark)")');
  expect(bootstrap).toContain('dataset.theme = "light"');
  expect(layout).toContain('content="light dark"');
});

// Accessible appearance controls and persistence are covered by settings.spec.ts.

test("dark appearance covers the workspace and floating navigation", async () => {
  const appCss = await Bun.file(`${import.meta.dir}/../src/app.css`).text();
  const navigationCss = await Bun.file(
    `${import.meta.dir}/../src/components/ui/bottom-nav-bar.css`,
  ).text();

  expect(appCss).toContain(':root[data-theme="dark"]');
  expect(appCss).toContain(':root[data-theme="dark"] .privacy-card');
  expect(appCss).toContain(':root[data-theme="dark"] .complaint-table th');
  expect(navigationCss).toContain(':root[data-theme="dark"] .bottom-nav');
  expect(navigationCss).toContain(':root[data-theme="dark"] .bottom-nav-item[data-active="true"]');
});

test("workspace header has no divider line", async () => {
  const appCss = await Bun.file(`${import.meta.dir}/../src/app.css`).text();
  const topbar = appCss.match(/\.topbar\s*\{([^}]*)\}/)?.[1];

  expect(topbar).toBeDefined();
  expect(topbar).not.toContain("border-bottom");
});

test("dark appearance uses neutral charcoal surfaces instead of blue-tinted backgrounds", async () => {
  const appCss = await Bun.file(`${import.meta.dir}/../src/app.css`).text();
  const bootstrap = await Bun.file(`${import.meta.dir}/../public/theme-bootstrap.js`).text();
  const navigationCss = await Bun.file(
    `${import.meta.dir}/../src/components/ui/bottom-nav-bar.css`,
  ).text();

  expect(appCss).toContain("background: #0e0e10");
  expect(appCss).toContain("--white: #151517");
  expect(appCss).toContain("background: var(--canvas)");
  expect(appCss).toContain("background: #1b1b1e");
  expect(appCss).toContain(".theme-preview-dark span:first-child");
  expect(appCss).toContain("background: #5f8ff5");
  expect(navigationCss).toContain("background: rgb(21 21 23 / 96%)");
  expect(navigationCss).toContain("background: #242428");
  expect(navigationCss).toContain("color: #5f8ff5");
  expect(bootstrap).toContain('theme === "dark" ? "#0e0e10"');
  expect(appCss).not.toContain("background: #111821");
  expect(appCss).not.toContain("background: #15223a");
});
