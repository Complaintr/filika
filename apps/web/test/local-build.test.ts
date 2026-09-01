import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildLocalDemo } from "../build";

test("workspace build compiles the stylesheet and both SDK modes into public", async () => {
  const directory = await mkdtemp(join(tmpdir(), "filika-workspace-build-"));
  try {
    await buildLocalDemo(directory);
    const css = await Bun.file(`${directory}/app.css`).text();
    expect(css).toContain(".workspace-shell");
    expect(css).toContain(".topbar");
    expect(await Bun.file(`${directory}/sdk/filika.js`).exists()).toBe(true);
    expect(await Bun.file(`${directory}/sdk/filika.development.js`).exists()).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 15_000);

test("workspace development compiles the stylesheet before Next starts", async () => {
  const packageJson = await Bun.file(`${import.meta.dir}/../package.json`).json();

  expect(packageJson.scripts.dev).toBe("bun run build:spa && next dev -p 4173");
});
