import type { Metadata } from "next";
import { DemoExperience } from "@/components/demo/demo-experience";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Test Filika with a real but broken storefront. Use a WebMCP-enabled AI agent to shop and Filika will catch the problem.",
};

export default function DemoPage() {
  return <DemoExperience />;
}
