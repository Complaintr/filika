import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundleSdk } from "../../../packages/sdk/build";
import { buildLocalDemo } from "../build";

test("local demo preserves the standalone SDK classic script and exact bundle bytes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "filika-demo-build-"));
  try {
    await buildLocalDemo(directory);
    const html = await Bun.file(`${directory}/index.html`).text();
    expect(html).toContain('<script src="/sdk/filika.development.js"');
    expect(html).toContain('type="module" src="./index.js"');
    expect(html.indexOf("/sdk/filika.development.js")).toBeLessThan(html.indexOf("./index.js"));
    const expected = await bundleSdk(true);
    expect(await Bun.file(`${directory}/sdk/filika.development.js`).bytes()).toEqual(expected.code);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
