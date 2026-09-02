import { afterEach, describe, expect, test } from "bun:test";
import {
  DEMO_CHECKOUT_FAILURE_CODE,
  DEMO_DRAFT,
  DEMO_STEPS,
  TEST_DEMO_PROMPT,
} from "../src/components/demo/demo-data";
import { DemoFlowPanel } from "../src/components/demo/demo-flow-panel";
import { DemoStore, type DemoStoreState } from "../src/components/demo/demo-store";
import { renderReact } from "./helpers/render-react";

const initialStore: DemoStoreState = { cart: [], orderPlaced: false, stuck: false };

describe("demo-store", () => {
  test("renders products and lets the agent add to cart", async () => {
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
    const add = [...result.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Add to cart",
    );
    add?.click();
    expect(state.cart).toContain("headphones");
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
  test("renders every demo step and reports progress", async () => {
    const result = await renderReact(
      <DemoFlowPanel
        activeIndex={1}
        hidden={false}
        onNavigate={() => {}}
        onReset={() => {}}
        onToggleHidden={() => {}}
      />,
    );
    expect(result.container.querySelectorAll("li")).toHaveLength(DEMO_STEPS.length);
    expect(result.container.textContent).toContain(`2 / ${DEMO_STEPS.length}`);
    await result.close();
  });

  test("previous is disabled on the first step and next on the last", async () => {
    const result = await renderReact(
      <DemoFlowPanel
        activeIndex={0}
        hidden={false}
        onNavigate={() => {}}
        onReset={() => {}}
        onToggleHidden={() => {}}
      />,
    );
    const buttons = [...result.container.querySelectorAll("button")];
    const back = buttons.find((button) => button.textContent?.includes("Back"));
    const next = buttons.find((button) => button.textContent?.includes("Next"));
    expect(back?.hasAttribute("disabled")).toBe(true);
    expect(next?.hasAttribute("disabled")).toBe(false);
    await result.close();
  });

  test("navigating and resetting call the callbacks", async () => {
    const calls: number[] = [];
    const resets: boolean[] = [];
    const result = await renderReact(
      <DemoFlowPanel
        activeIndex={1}
        hidden={false}
        onNavigate={(index) => calls.push(index)}
        onReset={() => resets.push(true)}
        onToggleHidden={() => {}}
      />,
    );
    const next = [...result.container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Next"),
    );
    next?.click();
    expect(calls).toEqual([2]);
    const reset = [...result.container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Reset"),
    );
    reset?.click();
    expect(resets).toEqual([true]);
    await result.close();
  });

  test("hiding collapses the panel", async () => {
    const result = await renderReact(
      <DemoFlowPanel
        activeIndex={0}
        hidden={true}
        onNavigate={() => {}}
        onReset={() => {}}
        onToggleHidden={() => {}}
      />,
    );
    expect(result.container.textContent).not.toContain("Reset demo");
    await result.close();
  });
});

describe("demo-data", () => {
  test("defines a complete, ordered tour", () => {
    expect(DEMO_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_STEPS.map((step) => step.id)).toEqual([
      "intro",
      "prompt",
      "product",
      "checkout",
      "hidden",
      "report",
      "review",
      "result",
    ]);
    for (const step of DEMO_STEPS) {
      expect(step.target).toMatch(/^#/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  test("the test prompt is short and names the broken action", () => {
    expect(TEST_DEMO_PROMPT).toContain("Wireless Headphones");
    expect(TEST_DEMO_PROMPT).toContain("checkout");
    expect(TEST_DEMO_PROMPT.length).toBeLessThan(200);
  });

  test("the agent draft is a checkout bug", () => {
    expect(DEMO_DRAFT.kind).toBe("bug");
    expect(DEMO_DRAFT.title).toContain("Checkout");
    expect(DEMO_DRAFT.reproductionSteps.length).toBeGreaterThan(0);
  });

  test("the failure code is stable and documented", () => {
    expect(DEMO_CHECKOUT_FAILURE_CODE).toBe("FILIKA_DEMO_CHECKOUT_504");
  });
});
