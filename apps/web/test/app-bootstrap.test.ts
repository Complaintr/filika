import { expect, test } from "bun:test";

test("workspace pages never expose or mutate a public SDK global", async () => {
  const layout = await Bun.file(`${import.meta.dir}/../app/layout.tsx`).text();
  const shell = await Bun.file(`${import.meta.dir}/../src/workspace/workspace-shell.tsx`).text();
  for (const source of [layout, shell]) {
    expect(source).not.toContain("window.Filika");
    expect(source).not.toContain("globalThis.Filika");
  }
});

test("the root layout does not load the SDK bundle", async () => {
  const layout = await Bun.file(`${import.meta.dir}/../app/layout.tsx`).text();
  expect(layout).not.toContain("/sdk/filika.development.js");
  expect(layout).toContain('rel="stylesheet" href="/app.css"');
});
