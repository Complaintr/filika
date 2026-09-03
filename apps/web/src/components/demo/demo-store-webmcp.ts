import { DEMO_CHECKOUT_FAILURE_CODE, DEMO_PRODUCTS } from "./demo-data";

/**
 * The demo storefront exposes its own WebMCP tools so a browser agent can shop
 * through document.modelContext instead of guessing through the UI. The tools
 * share the same cart state as the visible storefront, so the agent's actions
 * update the live demo panel exactly like a human clicking the page.
 */

export interface DemoStoreTools {
  addToCart(productId: string): { ok: true } | { ok: false; error: string };
  placeOrder(signal: AbortSignal): Promise<{ ok: true } | { ok: false; error: string }>;
}

export interface DemoStoreToolResult {
  content: Array<{ text: string; type: "text" }>;
}

export interface DemoStoreTool {
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  description: string;
  execute(input: unknown, options: { signal: AbortSignal }): Promise<DemoStoreToolResult>;
  inputSchema: {
    additionalProperties: false;
    properties: Record<string, unknown>;
    required?: readonly string[];
    type: "object";
  };
  name: string;
  title: string;
}

const MAX_PRODUCT_ID_LENGTH = 48;
const MAX_RESULT_TEXT_LENGTH = 512;

export const DEMO_LIST_PRODUCTS_TOOL = "demo_list_products";
export const DEMO_ADD_TO_CART_TOOL = "demo_add_to_cart";
export const DEMO_PLACE_ORDER_TOOL = "demo_place_order";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textResult(text: string): DemoStoreToolResult {
  const bounded =
    text.length > MAX_RESULT_TEXT_LENGTH ? text.slice(0, MAX_RESULT_TEXT_LENGTH) : text;
  return { content: [{ text: bounded, type: "text" }] };
}

const noArgumentsSchema = {
  additionalProperties: false,
  properties: {},
  type: "object",
} as const;

function emptyInput(input: unknown): { ok: true } | { ok: false; error: string } {
  if (!isRecord(input) || Object.keys(input).length !== 0) {
    return { ok: false, error: "This tool takes no arguments." };
  }
  return { ok: true };
}

function parseProductId(
  input: unknown,
): { ok: true; productId: string } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "Input must be an object." };
  const keys = Object.keys(input);
  if (keys.length !== 1 || keys[0] !== "productId") {
    return { ok: false, error: "Input must contain only the productId field." };
  }
  const productId = input.productId;
  if (
    typeof productId !== "string" ||
    productId.length === 0 ||
    productId.length > MAX_PRODUCT_ID_LENGTH
  ) {
    return { ok: false, error: "productId must be a non-empty string of at most 48 characters." };
  }
  if (!DEMO_PRODUCTS.some((product) => product.id === productId)) {
    return { ok: false, error: `Unknown product id "${productId}".` };
  }
  return { ok: true, productId };
}

function catalogText(): string {
  const lines = DEMO_PRODUCTS.map(
    (product) => `${product.id}: ${product.name} (${product.price}) — ${product.tagline}`,
  );
  return `Available products:\n${lines.join("\n")}`;
}

/**
 * Pure tool definitions bound to a caller-supplied controller. The controller
 * owns the cart state, so the same rules (one item at a time, deterministic
 * checkout timeout) apply to agents and to the visible UI.
 */
export function buildDemoStoreTools(tools: DemoStoreTools): readonly DemoStoreTool[] {
  return [
    {
      name: DEMO_LIST_PRODUCTS_TOOL,
      title: "List demo products",
      description:
        "Lists the products in the demo audio store with their ids, names, prices, and descriptions.",
      inputSchema: noArgumentsSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input) => {
        const check = emptyInput(input);
        return check.ok ? textResult(catalogText()) : textResult(check.error);
      },
    },
    {
      name: DEMO_ADD_TO_CART_TOOL,
      title: "Add product to cart",
      description:
        "Adds one product from the demo store catalog to the cart. The cart holds a single item, so a second add fails until the demo is reset.",
      inputSchema: {
        additionalProperties: false,
        properties: { productId: { type: "string", minLength: 1, maxLength: 48 } },
        required: ["productId"],
        type: "object",
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const parsed = parseProductId(input);
        if (!parsed.ok) return textResult(parsed.error);
        const result = tools.addToCart(parsed.productId);
        return result.ok
          ? textResult(`Added "${parsed.productId}" to the cart. The cart now contains 1 item.`)
          : textResult(result.error);
      },
    },
    {
      name: DEMO_PLACE_ORDER_TOOL,
      title: "Place demo order",
      description:
        "Attempts to complete checkout for the item in the demo cart. The demo checkout is intentionally broken and times out deterministically.",
      inputSchema: noArgumentsSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, options) => {
        const check = emptyInput(input);
        if (!check.ok) return textResult(check.error);
        const result = await tools.placeOrder(options.signal);
        return result.ok ? textResult("Order placed successfully.") : textResult(result.error);
      },
    },
  ];
}

type ModelContextRegister = (
  tool: DemoStoreTool,
  options: { signal: AbortSignal },
) => Promise<void>;

function detectRegister(documentValue: unknown): ModelContextRegister | null {
  try {
    if (typeof documentValue !== "object" || documentValue === null) return null;
    const context: unknown = Reflect.get(documentValue, "modelContext");
    if (typeof context !== "object" || context === null) return null;
    const register: unknown = Reflect.get(context, "registerTool");
    if (typeof register !== "function") return null;
    return async (tool, options) => {
      await Reflect.apply(register as (...args: unknown[]) => unknown, context, [tool, options]);
    };
  } catch {
    return null;
  }
}

/**
 * Registers the store tools on document.modelContext. Registration is best
 * effort: unsupported browsers and rejected registrations must never break the
 * host page, matching the SDK's contract.
 */
export async function registerDemoStoreTools(
  documentValue: unknown,
  controller: AbortController,
  tools: DemoStoreTools,
): Promise<void> {
  const register = detectRegister(documentValue);
  if (register === null) return;
  for (const tool of buildDemoStoreTools(tools)) {
    if (controller.signal.aborted) return;
    try {
      await register(tool, { signal: controller.signal });
    } catch {
      // A rejected registration must not fail the page or other tools.
    }
  }
}

export function demoCheckoutFailureText(): string {
  return `Checkout timed out (${DEMO_CHECKOUT_FAILURE_CODE}). The order never completes.`;
}
