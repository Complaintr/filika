import type { Metadata } from "next";
import { DemoWorkspaceDetail } from "@/components/demo/demo-workspace-detail";

export const metadata: Metadata = {
  title: "Demo complaint",
  description: "A reviewed complaint from the Filika demo store.",
};

export default async function DemoWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  const { feedbackId } = await params;
  return <DemoWorkspaceDetail feedbackId={feedbackId} />;
}
