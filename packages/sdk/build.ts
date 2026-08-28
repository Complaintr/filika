import { type BuildOptions, build, version as esbuildVersion } from "esbuild";
import { version } from "./src/version";

export const SDK_BUILD_OPTIONS = {
  absWorkingDir: import.meta.dir,
  entryPoints: ["src/browser.ts"],
  outfile: "dist/filika.js",
  bundle: true,
  minify: true,
  format: "iife",
  define: { __FILIKA_DEVELOPMENT__: "false" },
  platform: "browser",
  target: "es2022",
  splitting: false,
  sourcemap: false,
  legalComments: "inline",
  charset: "utf8",
} satisfies BuildOptions;

/** Keep the browser runtime independent of workspace and third-party packages. */
export function assertSdkInputs(inputs: readonly string[]): void {
  if (
    inputs.some(
      (input) => input !== "package.json" && !/^src\/(?:[a-z-]+\/)*[a-z-]+\.ts$/u.test(input),
    )
  )
    throw new Error("SDK bundle must contain only SDK source and its package metadata");
}

export async function bundleSdk(development = false) {
  const filename = development ? "filika.development.js" : "filika.js";
  const result = await build({
    ...SDK_BUILD_OPTIONS,
    outfile: `dist/${filename}`,
    define: { __FILIKA_DEVELOPMENT__: String(development) },
    write: false,
    metafile: true,
  });
  const output = result.outputFiles?.[0];
  if (!output || result.outputFiles?.length !== 1) throw new Error("Expected one IIFE bundle");
  if (Object.values(result.metafile?.outputs ?? {}).some((entry) => entry.imports.length > 0))
    throw new Error("Unexpected external imports");
  const inputs = Object.keys(result.metafile?.inputs ?? {}).sort();
  assertSdkInputs(inputs);
  const metadata = {
    sdkVersion: version,
    esbuildVersion,
    mode: development ? "development" : "production",
    format: "iife",
    target: SDK_BUILD_OPTIONS.target,
    file: filename,
    bytes: output.contents.byteLength,
    sha256: new Bun.CryptoHasher("sha256").update(output.contents).digest("hex"),
    integrity: `sha384-${new Bun.CryptoHasher("sha384").update(output.contents).digest("base64")}`,
    inputs,
  };
  return { code: output.contents, metadata };
}

if (import.meta.main) {
  const result = await bundleSdk(Bun.argv.includes("--development"));
  await Bun.write(new URL(`dist/${result.metadata.file}`, import.meta.url), result.code);
  await Bun.write(
    new URL(`dist/${result.metadata.file.replace(/\.js$/u, ".meta.json")}`, import.meta.url),
    `${JSON.stringify(result.metadata, null, 2)}\n`,
  );
}
