import { expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { SDK_BUILD_OPTIONS } from "../build";
import { version } from "../src";

test("builds one standalone classic script with a Filika global and no external imports", async () => {
  const result = await build({ ...SDK_BUILD_OPTIONS, write: false, metafile: true });
  expect(result.outputFiles).toHaveLength(1);
  const output = result.outputFiles?.[0];
  if (!output) throw new Error("Expected one browser bundle");
  expect(output.path.endsWith("/dist/filika.js")).toBe(true);
  for (const metadata of Object.values(result.metafile?.outputs ?? {})) {
    expect(metadata.imports).toEqual([]);
  }
  // A bare context has no DOM, fetch, module loader, or Bun runtime.
  const context: Record<string, unknown> = {};
  runInNewContext(output.text, context, { timeout: 1000 });
  expect(Object.keys(context)).toEqual(["Filika"]);
  expect(runInNewContext("Filika.version", context)).toBe(version);
  expect(runInNewContext("Filika.FEEDBACK_TOOL.name", context)).toBe("filika_submit_feedback");
  expect(runInNewContext("typeof Filika.parseReceipt", context)).toBe("function");
  expect(runInNewContext("typeof Filika.init", context)).toBe("undefined");
});
