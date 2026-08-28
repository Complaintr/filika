import { bundleSdk } from "../../packages/sdk/build";

/** Keep the SDK as a classic script: HTML bundling would lose currentScript. */
export async function buildLocalDemo(outdir = `${import.meta.dir}/dist`) {
  const sdk = await bundleSdk(true);
  const app = await Bun.build({
    entrypoints: [`${import.meta.dir}/src/index.ts`],
    outdir,
    target: "browser",
    naming: "index.js",
  });
  if (!app.success) throw new AggregateError(app.logs, "Demo build failed");
  const html = await Bun.file(`${import.meta.dir}/src/index.html`).text();
  await Bun.write(`${outdir}/index.html`, html.replace("./index.ts", "./index.js"));
  await Bun.write(`${outdir}/app.css`, Bun.file(`${import.meta.dir}/src/app.css`));
  await Bun.write(`${outdir}/sdk/${sdk.metadata.file}`, sdk.code);
}

if (import.meta.main) await buildLocalDemo();
