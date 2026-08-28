/** Compile the workspace stylesheet into Next.js's public directory. */
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
  if ((await styles.exited) !== 0) throw new Error("Workspace stylesheet build failed");
}

export const buildLocalDemo = buildWorkspace;

if (import.meta.main) await buildWorkspace();
