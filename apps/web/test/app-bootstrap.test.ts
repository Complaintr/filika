import { expect, test } from "bun:test";

test("workspace entry does not expose or mutate a public SDK global", async () => {
  const src = await Bun.file(`${import.meta.dir}/../src/index.ts`).text();
  expect(src).not.toContain("window.Filika");
  expect(src).not.toContain("globalThis.Filika");
  expect(src).toContain('document.getElementById("app")');
});

test("the workspace page does not load the SDK bundle", async () => {
  const html = await Bun.file(`${import.meta.dir}/../src/index.html`).text();
  expect(html).not.toContain("/sdk/filika.development.js");
  expect(html).toContain("/index.ts");
});
