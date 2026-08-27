import { type BuildOptions, build } from "esbuild";

export const SDK_BUILD_OPTIONS = {
  absWorkingDir: import.meta.dir,
  entryPoints: ["src/browser.ts"],
  outfile: "dist/filika.js",
  bundle: true,
  format: "iife",
  define: { __FILIKA_DEVELOPMENT__: "false" },
  platform: "browser",
  target: "es2022",
  splitting: false,
  sourcemap: false,
  legalComments: "inline",
  charset: "utf8",
} satisfies BuildOptions;

if (import.meta.main) {
  await build(SDK_BUILD_OPTIONS);
}
