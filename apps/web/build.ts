import { bundleSdk } from "../../packages/sdk/build";

const FIXTURE_FILES = ["hostile-css.html", "hostile-css-advanced.html"] as const;

/** Build the standalone workspace SPA into Next.js's public directory. */
export async function buildWorkspace(outdir = `${import.meta.dir}/public`) {
  const sdk = await bundleSdk(true);
  const app = await Bun.build({
    entrypoints: [`${import.meta.dir}/src/index.ts`],
    outdir,
    target: "browser",
    naming: "index.js",
    define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development") },
  });
  if (!app.success) throw new AggregateError(app.logs, "Workspace build failed");
  const styles = Bun.spawn(
    [
      process.execPath,
      "x",
      "--no-install",
      "@tailwindcss/cli",
      "--input",
      `${import.meta.dir}/src/styles/tailwind.css`,
      "--output",
      `${outdir}/app.css`,
      "--minify",
    ],
    { cwd: import.meta.dir, stdout: "inherit", stderr: "inherit" },
  );
  if ((await styles.exited) !== 0) throw new Error("Workspace stylesheet build failed");
  const html = await Bun.file(`${import.meta.dir}/src/index.html`).text();
  await Bun.write(`${outdir}/index.html`, html.replace("/index.ts", "/index.js"));
  await Bun.write(`${outdir}/sdk/${sdk.metadata.file}`, sdk.code);
  for (const fixture of FIXTURE_FILES) {
    await Bun.write(
      `${outdir}/fixtures/${fixture}`,
      Bun.file(`${import.meta.dir}/../../tests/e2e/fixtures/${fixture}`),
    );
  }
}

export const buildLocalDemo = buildWorkspace;

if (import.meta.main) await buildWorkspace();