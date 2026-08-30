import { redirect } from "next/navigation";

export default async function ApplicationHome({
  params,
}: {
  params: Promise<{ appSlug: string }>;
}) {
  const { appSlug } = await params;
  redirect(`/${encodeURIComponent(appSlug)}/complaints`);
}
