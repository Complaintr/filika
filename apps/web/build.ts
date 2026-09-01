import { mkdir } from "node:fs/promises";
import { bundleSdk } from "../../packages/sdk/build";

async function buildSdkAssets(outdir: string) {
  const sdkDirectory = `${outdir}/sdk`;
  await mkdir(sdkDirectory, { recursive: true });
  // esbuild's Bun service is process-global; keep the two modes sequential.
  const production = await bundleSdk(false);
  const development = await bundleSdk(true);
  await Promise.all([
    Bun.write(`${sdkDirectory}/${production.metadata.file}`, production.code),
    Bun.write(`${sdkDirectory}/${development.metadata.file}`, development.code),
  ]);
}

/** Compile the workspace assets into Next.js's public directory. */
export async function buildWorkspace(outdir = `${import.meta.dir}/public`) {
  const webRoot = import.meta.dir;
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
  const styleExit = await styles.exited;
  if (styleExit !== 0) throw new Error("Workspace stylesheet build failed");
  await buildSdkAssets(outdir);
}

export const buildLocalDemo = buildWorkspace;

if (import.meta.main) await buildWorkspace();
