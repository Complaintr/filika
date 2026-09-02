export const TEST_DEMO_PROMPT =
  "Buy the Wireless Headphones and complete checkout. Report any failure through Filika.";

export const DEMO_CHECKOUT_FAILURE_CODE = "FILIKA_DEMO_CHECKOUT_504";

export interface DemoProduct {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
  image: string;
  imageAlt: string;
  tagline: string;
}

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: "headphones",
    name: "Aurora Wireless Headphones",
    price: "$89.00",
    oldPrice: "$129.00",
    image: "/demo/headphones.webp",
    imageAlt: "Black over-ear wireless headphones",
    tagline: "Noise cancelling · 30h battery",
  },
  {
    id: "keyboard",
    name: "Pulse Mechanical Keyboard",
    price: "$64.00",
    oldPrice: "$84.00",
    image: "/demo/keyboard.webp",
    imageAlt: "Compact black mechanical keyboard with blue accent keys",
    tagline: "Hot-swappable · compact layout",
  },
  {
    id: "deskmat",
    name: "Studio Desk Mat",
    price: "$24.00",
    image: "/demo/deskmat.webp",
    imageAlt: "Charcoal desk mat with stitched edges",
    tagline: "Wide surface · stitched edges",
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
    title: "Open the demo store",
    description: "This storefront contains a checkout failure for the agent to discover.",
    target: "#demo-store",
  },
  {
    id: "prompt",
    title: "Give the agent a task",
    description: "Copy the prompt and ask your WebMCP agent to complete the purchase.",
    target: "#demo-prompt",
  },
  {
    id: "product",
    title: "Agent chooses the product",
    description: "The agent selects the Wireless Headphones and adds them to the cart.",
    target: "#demo-product-headphones",
  },
  {
    id: "checkout",
    title: "Checkout fails",
    description: "Placing the order never completes because the payment times out.",
    target: "#demo-place-order",
  },
  {
    id: "hidden",
    title: "Agent calls Filika",
    description: "The agent uses the WebMCP tool to prepare the failure for your review.",
    target: "#demo-hidden-instruction",
  },
  {
    id: "review",
    title: "Review and confirm",
    description: "Nothing is sent until you approve the report.",
    target: "#demo-review",
  },
  {
    id: "result",
    title: "Feedback arrives",
    description: "The report is stored for this device and ready for a GitHub issue.",
    target: "#demo-result",
  },
];
