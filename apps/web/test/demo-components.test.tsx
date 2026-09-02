import { describe, expect, test } from "bun:test";
import { DEMO_CHECKOUT_FAILURE_CODE, TEST_DEMO_PROMPT } from "../src/components/demo/demo-data";
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
    expect(result.container.textContent).toContain("Prompt copied");
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

describe("demo-data", () => {
  test("the test prompt is short and names the broken action", () => {
    expect(TEST_DEMO_PROMPT).toContain("Wireless Headphones");
    expect(TEST_DEMO_PROMPT).toContain("checkout");
    expect(TEST_DEMO_PROMPT.length).toBeLessThan(200);
  });

  test("the failure code is stable and documented", () => {
    expect(DEMO_CHECKOUT_FAILURE_CODE).toBe("FILIKA_DEMO_CHECKOUT_504");
  });
});
