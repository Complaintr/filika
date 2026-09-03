import { describe, expect, test } from "bun:test";
import { DEMO_CHECKOUT_FAILURE_CODE, demoPrompt } from "../src/components/demo/demo-data";
import { DemoExperience } from "../src/components/demo/demo-experience";
import { DemoFlowPanel } from "../src/components/demo/demo-flow-panel";
import { DemoStore, type DemoStoreState } from "../src/components/demo/demo-store";
import { renderReact } from "./helpers/render-react";

const initialStore: DemoStoreState = { cart: [], orderPlaced: false, stuck: false };

describe("demo-store", () => {
  test("renders products and lets the browser agent add one to the cart", async () => {
    let state = initialStore;
    const result = await renderReact(
      <DemoStore
        state={state}
        onChange={(next) => {
          state = next;
        }}
      />,
    );
    expect(result.container.textContent).toContain("acmeaudio");
    expect(result.container.textContent).toContain("Wireless Headphones");
    expect(result.container.textContent).toContain("Mechanical Keyboard");
    expect(result.container.querySelectorAll("img")).toHaveLength(3);
    const add = [...result.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Add to cart",
    );
    add?.click();
    expect(state.cart).toEqual(["headphones"]);
    await result.close();
  });

  test("checkout only appears once an item is in the cart", async () => {
    const result = await renderReact(<DemoStore state={initialStore} onChange={() => {}} />);
    expect(result.container.querySelector('[data-demo-step="checkout"]')).toBeNull();
    await result.close();
  });

  test("reports a deterministic 504 failure on order", async () => {
    let state: DemoStoreState = { cart: ["headphones"], orderPlaced: false, stuck: false };
    const result = await renderReact(
      <DemoStore
        state={state}
        onChange={(next) => {
          state = next;
        }}
      />,
    );
    const place = result.container.querySelector<HTMLButtonElement>("#demo-place-order");
    expect(place).not.toBeNull();
    place?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.stuck).toBe(true);
    expect(state.orderPlaced).toBe(true);
    await result.close();
  });
});

describe("demo-flow-panel", () => {
  test("renders live state without navigation controls", async () => {
    const result = await renderReact(
      <DemoFlowPanel
        sdkReady={true}
        promptCopied={false}
        storeState={initialStore}
        feedbackReceived={false}
        onReset={() => {}}
      />,
    );
    expect(result.container.querySelectorAll("li")).toHaveLength(4);
    expect(result.container.textContent).toContain("Waiting for your agent");
    expect(result.container.textContent).toContain("Filika tool readyDone");
    expect(result.container.textContent).not.toContain("Next");
    await result.close();
  });

  test("reflects real store and feedback state", async () => {
    const result = await renderReact(
      <DemoFlowPanel
        sdkReady={true}
        promptCopied={true}
        storeState={{ cart: ["headphones"], orderPlaced: true, stuck: true }}
        feedbackReceived={true}
        onReset={() => {}}
      />,
    );
    expect(result.container.textContent).toContain("Feedback received");
    expect(result.container.textContent).toContain("Paste the prompt into your browser agent");
    expect(result.container.querySelectorAll("li small")).toHaveLength(4);
    await result.close();
  });

  test("reset calls the callback", async () => {
    const resets: boolean[] = [];
    const result = await renderReact(
      <DemoFlowPanel
        sdkReady={true}
        promptCopied={false}
        storeState={initialStore}
        feedbackReceived={false}
        onReset={() => resets.push(true)}
      />,
    );
    const reset = [...result.container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Reset"),
    );
    reset?.click();
    expect(resets).toEqual([true]);
    await result.close();
  });
});

describe("demo-experience", () => {
  test("explains when WebMCP tools are missing instead of waiting silently", async () => {
    const windowRef = (await renderReact(null)).window;
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: windowRef.localStorage,
    });
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: () => Promise.reject(new TypeError("no collector in unit tests")),
    });
    try {
      const result = await renderReact(<DemoExperience />);
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(result.container.querySelector('[data-demo-webmcp="missing"]')).not.toBeNull();
      expect(result.container.textContent).toContain("WebMCP tools are not available");
      expect(result.container.textContent).toContain("document.modelContext");
      await result.close();
    } finally {
      if (originalStorage === undefined) {
        Reflect.deleteProperty(globalThis, "localStorage");
      } else {
        Object.defineProperty(globalThis, "localStorage", originalStorage);
      }
      if (originalFetch === undefined) {
        Reflect.deleteProperty(globalThis, "fetch");
      } else {
        Object.defineProperty(globalThis, "fetch", originalFetch);
      }
      await windowRef.happyDOM.close();
    }
  });
});

describe("demo-data", () => {
  test("the test prompt is short, names the broken action and the page address", () => {
    const prompt = demoPrompt("https://example.test/demo");
    expect(prompt).toContain("https://example.test/demo");
    expect(prompt).toContain("Aurora Wireless Headphones");
    expect(prompt).toContain("demo_list_products");
    expect(prompt).toContain("demo_add_to_cart");
    expect(prompt).toContain("demo_place_order");
    expect(prompt).toContain("checkout");
    expect(prompt).toContain("filika_submit_feedback");
    expect(prompt).toContain("document.modelContext");
    expect(prompt.length).toBeLessThan(600);
  });

  test("the failure code is stable and documented", () => {
    expect(DEMO_CHECKOUT_FAILURE_CODE).toBe("FILIKA_DEMO_CHECKOUT_504");
  });
});
