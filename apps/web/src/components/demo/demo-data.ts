export const TEST_DEMO_PROMPT =
  "Buy the Wireless Headphones and finish checkout. If anything goes wrong, report it through Filika.";

export const DEMO_CHECKOUT_FAILURE_CODE = "FILIKA_DEMO_CHECKOUT_504";

export interface DemoProduct {
  id: string;
  name: string;
  price: string;
  tagline: string;
}

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: "headphones",
    name: "Wireless Headphones",
    price: "$89.00",
    tagline: "Noise cancelling, 30h battery",
  },
  {
    id: "keyboard",
    name: "Mechanical Keyboard",
    price: "$64.00",
    tagline: "Hot-swappable, gasket mount",
  },
  {
    id: "deskmat",
    name: "Desk Mat",
    price: "$24.00",
    tagline: "Wide cloth surface",
  },
];

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  target: string;
}

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    id: "intro",
    title: "Welcome to the Filika demo",
    description:
      "This is a real storefront with a hidden bug. Use a WebMCP-enabled AI agent to shop here and Filika will catch the problem.",
    target: "#demo-store",
  },
  {
    id: "prompt",
    title: "Give your agent this prompt",
    description:
      "Copy the prompt and ask your agent to follow it. The agent will browse the store, add to cart, and try to check out.",
    target: "#demo-prompt",
  },
  {
    id: "product",
    title: "The product",
    description:
      "Your agent picks the Wireless Headphones, adds them to the cart, and opens checkout.",
    target: "#demo-product-headphones",
  },
  {
    id: "checkout",
    title: "Checkout hangs",
    description:
      "Placing the order never completes. The payment confirmation times out and the page stays stuck on 'Submitting…'.",
    target: "#demo-place-order",
  },
  {
    id: "hidden",
    title: "A hidden site instruction",
    description:
      "This site carries a WebMCP instruction for agents: if a problem comes up here, report it through Filika.",
    target: "#demo-hidden-instruction",
  },
  {
    id: "report",
    title: "Your agent reports the problem",
    description:
      "The agent drafts a bug report through Filika's WebMCP tool and asks you to review it.",
    target: "#demo-report",
  },
  {
    id: "review",
    title: "You review before anything is sent",
    description:
      "Nothing leaves the browser until you confirm. Review the report, then confirm it.",
    target: "#demo-review",
  },
  {
    id: "result",
    title: "Complaint received",
    description:
      "The report is stored for this device. When you connect a repository, Filika can turn it into a GitHub issue automatically.",
    target: "#demo-result",
  },
];

export const DEMO_DRAFT = {
  kind: "bug",
  title: "Checkout hangs on payment",
  description:
    "After placing the order, the payment confirmation never completes and the page stays stuck on the submitting state.",
  expectedBehavior: "The order should complete and show a confirmation.",
  reproductionSteps: [
    "Open the store",
    "Add the Wireless Headphones to the cart",
    "Place the order",
  ],
};

export const DEMO_AGENT_LOG = [
  { tag: "NAV", text: "Opened the storefront" },
  { tag: "ACT", text: "Added Wireless Headphones to cart" },
  { tag: "NAV", text: "Opened checkout" },
  { tag: "ACT", text: 'Clicked "Place order"' },
  { tag: "NET", text: "POST /api/v1/demo/checkout -> 504" },
  { tag: "ERR", text: 'Order stuck on "Submitting…"' },
];
