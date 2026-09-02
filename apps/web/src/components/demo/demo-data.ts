export const TEST_DEMO_PROMPT =
  "Buy the Wireless Headphones and finish checkout. If anything goes wrong, report it through Filika.";

export const DEMO_CHECKOUT_FAILURE_CODE = "FILIKA_DEMO_CHECKOUT_504";

export interface DemoProduct {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
  rating: string;
  reviews: string;
  tagline: string;
  badge?: string;
  emoji: string;
}

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: "headphones",
    name: "Aurora Wireless Headphones",
    price: "$89.00",
    oldPrice: "$129.00",
    rating: "4.8",
    reviews: "2,134",
    tagline: "Noise cancelling · 30h battery · Bluetooth 5.4",
    badge: "Bestseller",
    emoji: "🎧",
  },
  {
    id: "keyboard",
    name: "Pulse Mechanical Keyboard",
    price: "$64.00",
    oldPrice: "$84.00",
    rating: "4.6",
    reviews: "1,076",
    tagline: "Hot-swappable · gasket mount · RGB",
    badge: "Hot",
    emoji: "⌨️",
  },
  {
    id: "deskmat",
    name: "Studio Desk Mat",
    price: "$24.00",
    rating: "4.7",
    reviews: "892",
    tagline: "Wide cloth surface · stitched edges",
    emoji: "🖥️",
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
    description: "Copy it and let your agent follow it — shop and check out.",
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
    description: "Placing the order never completes — the payment times out.",
    target: "#demo-place-order",
  },
  {
    id: "hidden",
    title: "A hidden site instruction",
    description: "The site tells agents: if a problem comes up, report it through Filika.",
    target: "#demo-hidden-instruction",
  },
  {
    id: "report",
    title: "Agent drafts a report",
    description: "It describes the checkout hang through Filika's WebMCP tool.",
    target: "#demo-report",
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
