import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundleSdk } from "../../../packages/sdk/build";
import { buildLocalDemo } from "../build";

test("workspace build emits the SPA shell, app bundle, stylesheet, and SDK bundle", async () => {
  const directory = await mkdtemp(join(tmpdir(), "filika-workspace-build-"));
  try {
    await buildLocalDemo(directory);
    const html = await Bun.file(`${directory}/index.html`).text();
    expect(html).toContain('type="module" src="/index.js"');
    expect(html).toContain('rel="stylesheet" href="/app.css"');
    expect(await Bun.file(`${directory}/index.js`).exists()).toBe(true);
    expect(await Bun.file(`${directory}/app.css`).exists()).toBe(true);
    const expected = await bundleSdk(true);
    expect(await Bun.file(`${directory}/sdk/${expected.metadata.file}`).bytes()).toEqual(
      expected.code,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
