import type { Metadata } from "next";
import { DemoWorkspaceList } from "@/components/demo/demo-workspace-list";

export const metadata: Metadata = {
  title: "Demo inbox",
  description: "The Filika demo inbox for this browser.",
};

export default function DemoWorkspacePage() {
  return <DemoWorkspaceList />;
}
