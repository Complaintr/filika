import { Window } from "happy-dom";

export interface RenderResult {
  close(): Promise<void>;
  container: HTMLElement;
  window: Window;
}

const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

function exposeGlobal(name: string, value: unknown): void {
  originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });
}

function restoreGlobals(): void {
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, name);
    } else {
      Object.defineProperty(globalThis, name, descriptor);
    }
  }
  originalGlobals.clear();
}

export async function renderReact(element: React.ReactNode): Promise<RenderResult> {
  const window = new Window({ url: "http://localhost:4173" });
  exposeGlobal("window", window);
  exposeGlobal("document", window.document);
  exposeGlobal("navigator", window.navigator);
  exposeGlobal("HTMLElement", window.HTMLElement);
  exposeGlobal("HTMLDivElement", window.HTMLDivElement);
  exposeGlobal("Element", window.Element);
  exposeGlobal("Node", window.Node);
  exposeGlobal("Event", window.Event);
  exposeGlobal("CustomEvent", window.CustomEvent);
  exposeGlobal("getComputedStyle", window.getComputedStyle.bind(window));
  exposeGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  exposeGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  exposeGlobal("AbortController", AbortController);

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(container);
  root.render(element);
  await new Promise((resolve) => setTimeout(resolve, 20));

  return {
    close: async () => {
      root.unmount();
      await new Promise((resolve) => setTimeout(resolve, 50));
      restoreGlobals();
      await window.happyDOM.close();
    },
    container,
    window,
  };
}

export async function renderReactToText(element: React.ReactNode): Promise<string> {
  const result = await renderReact(element);
  const text = result.container.textContent ?? "";
  await result.close();
  return text;
}
