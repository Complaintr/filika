export const TEST_DEMO_PROMPT =
  "Buy the Wireless Headphones and complete checkout. Report any failure through Filika.";

export const DEMO_CHECKOUT_FAILURE_CODE = "FILIKA_DEMO_CHECKOUT_504";

export interface DemoProduct {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
}

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: "headphones",
    name: "Aurora Wireless Headphones",
    price: "$89.00",
    oldPrice: "$129.00",
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
    title: "This is a demo store",
    description: "A real storefront with a hidden bug. Your WebMCP agent will shop here.",
    target: "#demo-store",
  },
  {
    id: "prompt",
    title: "Give your agent this prompt",
    description: "Copy it and let your agent follow it, shop, and check out.",
    target: "#demo-prompt",
  },
  {
    id: "product",
    title: "Agent picks a product",
    description: "It adds the Wireless Headphones to the cart and opens checkout.",
    target: "#demo-product-headphones",
  },
  {
    id: "checkout",
    title: "Checkout hangs",
    description: "Placing the order never completes because the payment times out.",
    target: "#demo-place-order",
  },
  {
    id: "hidden",
    title: "A hidden site instruction",
    description: "The site tells agents: if a problem comes up, report it through Filika.",
    target: "#demo-hidden-instruction",
  },
  {
    id: "review",
    title: "You review and confirm",
    description: "Nothing is sent until you approve the report.",
    target: "#demo-review",
  },
  {
    id: "result",
    title: "Complaint received",
    description: "The report is stored for this device and ready for a GitHub issue.",
    target: "#demo-result",
  },
];
