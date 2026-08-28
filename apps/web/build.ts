import { bundleSdk } from "../../packages/sdk/build";

async function buildSpaBundle(outdir: string, webRoot: string): Promise<void> {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "build",
      `${webRoot}/src/index.ts`,
      "--outfile",
      `${outdir}/index.js`,
      "--target",
      "browser",
    ],
    cwd: webRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Workspace build failed: ${new TextDecoder().decode(result.stderr).slice(0, 2000)}`,
    );
  }
}

/** Build the standalone workspace SPA into Next.js's public directory. */
export async function buildWorkspace(outdir = `${import.meta.dir}/public`) {
  const sdk = await bundleSdk(true);
  const webRoot = import.meta.dir;
  await buildSpaBundle(outdir, webRoot);
  const styles = Bun.spawn(
    [
      process.execPath,
      "x",
      "--no-install",
      "@tailwindcss/cli",
      "--input",
      `${webRoot}/src/styles/tailwind.css`,
      "--output",
      `${outdir}/app.css`,
      "--minify",
    ],
    { cwd: webRoot, stdout: "inherit", stderr: "inherit" },
  );
  if ((await styles.exited) !== 0) throw new Error("Workspace stylesheet build failed");
  const html = await Bun.file(`${webRoot}/src/index.html`).text();
  await Bun.write(`${outdir}/index.html`, html.replace("/index.ts", "/index.js"));
  await Bun.write(`${outdir}/sdk/${sdk.metadata.file}`, sdk.code);
}

export const buildLocalDemo = buildWorkspace;

if (import.meta.main) await buildWorkspace();
