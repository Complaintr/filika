import { describe, expect, test } from "bun:test";

import {
  buildDemoStoreTools,
  DEMO_ADD_TO_CART_TOOL,
  DEMO_LIST_PRODUCTS_TOOL,
  DEMO_PLACE_ORDER_TOOL,
  type DemoStoreTool,
  type DemoStoreTools,
  demoCheckoutFailureText,
  hasModelContext,
  registerDemoStoreTools,
} from "../src/components/demo/demo-store-webmcp";

const EMPTY_SIGNAL = new AbortController().signal;

function toolByName(tools: readonly DemoStoreTool[], name: string): DemoStoreTool {
  const tool = tools.find((item) => item.name === name);
  expect(tool).toBeDefined();
  return tool as DemoStoreTool;
}

function noopTools(): DemoStoreTools {
  return {
    addToCart: (productId) =>
      productId === "headphones" ? { ok: true } : { ok: false, error: "no" },
    placeOrder: async () => ({ ok: false, error: "no" }),
  };
}

describe("demo store WebMCP tools", () => {
  test("expose closed input schemas", () => {
    const tools = buildDemoStoreTools(noopTools());
    expect(tools.map((tool) => tool.name)).toEqual([
      DEMO_LIST_PRODUCTS_TOOL,
      DEMO_ADD_TO_CART_TOOL,
      DEMO_PLACE_ORDER_TOOL,
    ]);

    const list = toolByName(tools, DEMO_LIST_PRODUCTS_TOOL);
    expect(list.inputSchema).toEqual({
      additionalProperties: false,
      properties: {},
      type: "object",
    });
    expect(list.annotations.readOnlyHint).toBe(true);

    const add = toolByName(tools, DEMO_ADD_TO_CART_TOOL);
    expect(add.inputSchema).toEqual({
      additionalProperties: false,
      properties: { productId: { type: "string", minLength: 1, maxLength: 48 } },
      required: ["productId"],
      type: "object",
    });

    const place = toolByName(tools, DEMO_PLACE_ORDER_TOOL);
    expect(place.inputSchema.additionalProperties).toBe(false);
  });

  test("list_products returns a bounded catalog", async () => {
    const tool = toolByName(buildDemoStoreTools(noopTools()), DEMO_LIST_PRODUCTS_TOOL);
    const result = await tool.execute({}, { signal: EMPTY_SIGNAL });
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("headphones: Aurora Wireless Headphones");
    expect(result.content[0].text).toContain("deskmat");
  });

  test("list_products rejects arguments", async () => {
    const tool = toolByName(buildDemoStoreTools(noopTools()), DEMO_LIST_PRODUCTS_TOOL);
    const result = await tool.execute({ extra: true }, { signal: EMPTY_SIGNAL });
    expect(result.content[0].text).toContain("takes no arguments");
  });

  test("add_to_cart rejects unknown fields and unknown products", async () => {
    const tools = buildDemoStoreTools(noopTools());
    const add = toolByName(tools, DEMO_ADD_TO_CART_TOOL);

    const extraField = await add.execute(
      { productId: "headphones", quantity: 2 },
      { signal: EMPTY_SIGNAL },
    );
    expect(extraField.content[0].text).toContain("only the productId field");

    const missing = await add.execute({}, { signal: EMPTY_SIGNAL });
    expect(missing.content[0].text).toContain("only the productId field");

    const unknown = await add.execute({ productId: "not-a-product" }, { signal: EMPTY_SIGNAL });
    expect(unknown.content[0].text).toContain("Unknown product id");
  });

  test("add_to_cart forwards the product to the controller", async () => {
    let added = "";
    const add = toolByName(
      buildDemoStoreTools({
        ...noopTools(),
        addToCart: (productId) => {
          added = productId;
          return { ok: true };
        },
      }),
      DEMO_ADD_TO_CART_TOOL,
    );
    const result = await add.execute({ productId: "keyboard" }, { signal: EMPTY_SIGNAL });
    expect(added).toBe("keyboard");
    expect(result.content[0].text).toContain("Added");
  });

  test("place_order reflects the controller failure and the stable code", async () => {
    const place = toolByName(
      buildDemoStoreTools({
        ...noopTools(),
        placeOrder: async () => ({ ok: false, error: demoCheckoutFailureText() }),
      }),
      DEMO_PLACE_ORDER_TOOL,
    );
    const result = await place.execute({}, { signal: EMPTY_SIGNAL });
    expect(result.content[0].text).toBe(demoCheckoutFailureText());
  });

  test("registerDemoStoreTools registers all tools on modelContext", async () => {
    const registered: string[] = [];
    const documentValue = {
      modelContext: {
        registerTool: async (tool: DemoStoreTool) => {
          registered.push(tool.name);
        },
      },
    };
    const controller = new AbortController();
    await registerDemoStoreTools(documentValue, controller, noopTools());
    expect(registered).toEqual([
      DEMO_LIST_PRODUCTS_TOOL,
      DEMO_ADD_TO_CART_TOOL,
      DEMO_PLACE_ORDER_TOOL,
    ]);
  });

  test("registerDemoStoreTools is best effort on unsupported browsers", async () => {
    await expect(
      registerDemoStoreTools({}, new AbortController(), noopTools()),
    ).resolves.toBeUndefined();
    await expect(
      registerDemoStoreTools(
        { modelContext: { registerTool: async () => Promise.reject(new Error("denied")) } },
        new AbortController(),
        noopTools(),
      ),
    ).resolves.toBeUndefined();
  });

  test("hasModelContext detects a usable registerTool without touching other globals", () => {
    expect(hasModelContext({ modelContext: { registerTool: async () => {} } })).toBe(true);
    expect(hasModelContext({ modelContext: {} })).toBe(false);
    expect(hasModelContext({ modelContext: null })).toBe(false);
    expect(hasModelContext({})).toBe(false);
    expect(hasModelContext(null)).toBe(false);
  });

  test("registerDemoStoreTools stops after abort", async () => {
    const registered: string[] = [];
    const controller = new AbortController();
    controller.abort();
    const documentValue = {
      modelContext: {
        registerTool: async (tool: DemoStoreTool) => {
          registered.push(tool.name);
        },
      },
    };
    await registerDemoStoreTools(documentValue, controller, noopTools());
    expect(registered).toEqual([]);
  });
});
