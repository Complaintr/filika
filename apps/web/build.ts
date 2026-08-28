import { bundleSdk } from "../../packages/sdk/build";

/** Ship the SDK for host integrations without loading it in the workspace. */
export async function buildWorkspace(outdir = `${import.meta.dir}/dist`) {
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
}

// Preserve the existing build import for downstream tooling during migration.
export const buildLocalDemo = buildWorkspace;

if (import.meta.main) await buildWorkspace();
