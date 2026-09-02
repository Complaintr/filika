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
