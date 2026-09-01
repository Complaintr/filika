import type { Metadata } from "next";
import { OnboardingExperience } from "@/onboarding/onboarding-experience";

export const metadata: Metadata = { title: "Connect your first signal" };
export default function OnboardingPage() {
  return <OnboardingExperience />;
}
