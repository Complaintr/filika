import type { Metadata } from "next";
import { OnboardingExperience } from "@/onboarding/onboarding-experience";

export const metadata: Metadata = { title: "Make yourself at home · Filika" };
export default function OnboardingPage() {
  return <OnboardingExperience />;
}
