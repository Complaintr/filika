import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildLocalDemo } from "../build";

test("workspace build compiles the Tailwind stylesheet into public", async () => {
  const directory = await mkdtemp(join(tmpdir(), "filika-workspace-build-"));
  try {
    await buildLocalDemo(directory);
    const css = await Bun.file(`${directory}/app.css`).text();
    expect(css).toContain(".workspace-shell");
    expect(css).toContain(".topbar");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});