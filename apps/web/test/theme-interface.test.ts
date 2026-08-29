import { expect, test } from "bun:test";

test("the saved theme is applied before the workspace paints", async () => {
  const layout = await Bun.file(`${import.meta.dir}/../app/layout.tsx`).text();

  expect(layout).toContain('strategy="beforeInteractive"');
  expect(layout).toContain('saved.theme === "dark"');
  expect(layout).toContain('dataset.theme = "light"');
  expect(layout).toContain('content="light dark"');
});

test("settings expose accessible light and dark appearance choices", async () => {
  const settings = await Bun.file(`${import.meta.dir}/../app/settings/page.tsx`).text();

  expect(settings).toContain('<legend className="sr-only">Appearance</legend>');
  expect(settings).toContain('name="theme"');
  expect(settings).toContain('value="light"');
  expect(settings).toContain('value="dark"');
});

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
