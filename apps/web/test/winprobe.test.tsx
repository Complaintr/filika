import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { renderReact } from "./helpers/render-react";

test("probe globals", async () => {
  (globalThis as any).window = new Window({ url: "http://x" });
  console.log("globalThis.window set:", typeof globalThis.window);
  console.log("bare window:", typeof window);
  const r = await renderReact(<div>x</div>);
  await r.close();
});
