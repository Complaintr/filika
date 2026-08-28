import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { assertSdkInputs, bundleSdk, SDK_BUILD_OPTIONS } from "../build";
import {
  FEEDBACK_TOOL,
  type FilikaExecutionOutcome,
  type FilikaModelContextTool,
  version,
} from "../src";

test("builds one standalone classic script with a Filika global and no external imports", async () => {
  const result = await build({ ...SDK_BUILD_OPTIONS, write: false, metafile: true });
  expect(result.outputFiles).toHaveLength(1);
  const output = result.outputFiles?.[0];
  if (!output) throw new Error("Expected one browser bundle");
  expect(output.path.replaceAll("\\", "/").endsWith("/dist/filika.js")).toBe(true);
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
  expect(runInNewContext("typeof Filika.init", context)).toBe("function");
  expect(runInNewContext("Filika.status.state", context)).toBe("uninitialized");
  const first = context.Filika;
  runInNewContext(output.text, context, { timeout: 1000 });
  expect(context.Filika).toBe(first);
});

test("minified bundle and metadata are deterministic without absolute paths or timestamps", async () => {
  const first = await bundleSdk();
  const second = await bundleSdk();
  expect(first.code).toEqual(second.code);
  expect(first.metadata).toEqual(second.metadata);
  expect(first.metadata.bytes).toBe(first.code.byteLength);
  expect(first.metadata.sha256).toBe(
    new Bun.CryptoHasher("sha256").update(first.code).digest("hex"),
  );
  expect(first.metadata.inputs.every((path) => !path.startsWith("/"))).toBe(true);
  const unminified = await build({ ...SDK_BUILD_OPTIONS, write: false, minify: false });
  expect(first.code.byteLength).toBeLessThan(unminified.outputFiles?.[0]?.contents.byteLength ?? 0);
});

test("both bundle modes emit reproducible SRI matching the exact bytes", async () => {
  const integrities: string[] = [];
  for (const development of [false, true]) {
    const first = await bundleSdk(development);
    const second = await bundleSdk(development);
    const expected = `sha384-${createHash("sha384").update(first.code).digest("base64")}`;
    expect(first.metadata.integrity).toBe(expected);
    expect(first.metadata).toEqual(second.metadata);
    expect(first.code).toEqual(second.code);
    const changed = new Uint8Array(first.code);
    changed[0] = (changed[0] ?? 0) ^ 1;
    expect(`sha384-${createHash("sha384").update(changed).digest("base64")}`).not.toBe(expected);
    integrities.push(expected);
  }
  expect(integrities[0]).not.toBe(integrities[1]);
});

test("dependency audit rejects third-party, workspace, and runtime-shim bundle inputs", () => {
  expect(() => assertSdkInputs(["src/browser.ts", "src/abort.ts", "package.json"])).not.toThrow();
  for (const input of [
    "../../node_modules/zod/index.js",
    "node_modules/ajv/index.js",
    "../collector/src/index.ts",
    "../../apps/web/src/index.ts",
    "src/../../private.ts",
    "/absolute/path.ts",
    "<runtime-shim>",
  ])
    expect(() => assertSdkInputs(["src/browser.ts", input])).toThrow("only SDK source");
});

test("production global cannot enable HTTP; development bundle accepts only loopback", async () => {
  for (const development of [false, true]) {
    const bundle = await bundleSdk(development);
    const context = {
      URL,
      AbortController,
      AbortSignal,
      setTimeout,
      clearTimeout,
      structuredClone,
    };
    runInNewContext(new TextDecoder().decode(bundle.code), context);
    const result = await runInNewContext(
      'Filika.init({projectKey:"demo",endpoint:"http://localhost:4173/api/v1/feedback"})',
      context,
    );
    expect(result.status.state).toBe(development ? "unsupported_browser" : "invalid_configuration");
    expect(runInNewContext("typeof Filika.createSdk", context)).toBe("undefined");
    runInNewContext("Filika.dispose()", context);
    const denied = await runInNewContext(
      'Filika.init({projectKey:"demo",endpoint:"http://localhost.evil/api/v1/feedback"})',
      context,
    );
    expect(denied.code).toBe("invalid_configuration");
  }
});

test("both shipped bundles register exactly the frozen V1 tool contract", async () => {
  for (const development of [false, true]) {
    const registered: FilikaModelContextTool<FilikaExecutionOutcome>[] = [];
    const context = {
      URL,
      AbortController,
      AbortSignal,
      setTimeout,
      clearTimeout,
      structuredClone,
      document: {
        modelContext: {
          registerTool(tool: FilikaModelContextTool<FilikaExecutionOutcome>) {
            registered.push(tool);
          },
        },
      },
    };
    const bundle = await bundleSdk(development);
    runInNewContext(new TextDecoder().decode(bundle.code), context);
    await runInNewContext(
      'Filika.init({projectKey:"demo",endpoint:"https://collector.example/api/v1/feedback"})',
      context,
    );
    expect(registered).toHaveLength(1);
    const tool = registered[0];
    if (!tool) throw new Error("Expected registered tool");
    const { execute, ...metadata } = tool;
    expect(typeof execute).toBe("function");
    expect(JSON.parse(JSON.stringify(metadata))).toEqual(FEEDBACK_TOOL);
    runInNewContext("Filika.dispose()", context);
  }
});
