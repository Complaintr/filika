import { Suspense } from "react";
import { AuthExperience } from "@/auth/auth-experience";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AuthExperience />
      </Suspense>
      {children}
    </>
  );
}
