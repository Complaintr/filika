import type { Metadata } from "next";
import { DemoWorkspaceList } from "@/components/demo/demo-workspace-list";

export const metadata: Metadata = {
  title: "Demo workspace",
  description: "The Filika demo inbox for this device.",
};

export default function DemoWorkspacePage() {
  return <DemoWorkspaceList />;
}
