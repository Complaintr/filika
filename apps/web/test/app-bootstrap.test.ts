import { afterEach, expect, test } from "bun:test";
import { Window } from "happy-dom";

const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

function exposeGlobal(name: string, value: unknown): void {
  originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });
}

afterEach(() => {
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, name);
    } else {
      Object.defineProperty(globalThis, name, descriptor);
    }
  }
  originalGlobals.clear();
});

test("boots beside the read-only public SDK global", async () => {
  const browserWindow = new Window({ url: "http://localhost:4173" });
  const { document } = browserWindow;
  document.body.innerHTML = `
    <header>
      <button id="nav-demo" type="button">Demo</button>
      <button id="nav-inbox" type="button">Inbox</button>
      <p id="webmcp-status"></p>
      <div id="theme-switcher"></div>
    </header>
    <main id="app-content"></main>
    <div id="filika-feedback-root"></div>
  `;

  const publicSdk = Object.freeze({ open: () => Promise.resolve(), status: { state: "ready" } });
  Object.defineProperty(browserWindow, "Filika", {
    enumerable: true,
    value: publicSdk,
  });

  exposeGlobal("window", browserWindow);
  exposeGlobal("document", document);
  exposeGlobal("localStorage", browserWindow.localStorage);
  exposeGlobal("HTMLElement", browserWindow.HTMLElement);
  exposeGlobal("DOMException", browserWindow.DOMException);

  await import(`../src/index.ts?bootstrap=${crypto.randomUUID()}`);

  expect(document.querySelector("main")?.textContent).toContain(
    "A small task with a useful failure.",
  );
  expect(browserWindow.Filika).toBe(publicSdk);
});
