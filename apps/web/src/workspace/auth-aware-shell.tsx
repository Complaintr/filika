"use client";

import { usePathname } from "next/navigation";
import { ApplicationProvider } from "@/applications/application-context";
import { AppearanceSync } from "./appearance-sync";
import { WorkspaceShell } from "./workspace-shell";

const STANDALONE_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/onboarding",
  "/demo",
  "/demo/workspace",
]);

/**
 * Renders the workspace shell (topbar and bottom navigation) for workspace
 * pages. Standalone paths such as the login page render their children without
 * the shell. Demo pages (storefront and the separate demo workspace) are also
 * standalone so demo activity never mixes with the account workspace. Other
 * `/demo/*` paths fall through to `[appSlug]` and must keep the shell.
 */
export function AuthAwareShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = STANDALONE_PATHS.has(pathname) || pathname.startsWith("/demo/workspace/");

  if (standalone) {
    return (
      <>
        <AppearanceSync />
        {children}
      </>
    );
  }

  return (
    <ApplicationProvider>
      <AppearanceSync />
      <WorkspaceShell>{children}</WorkspaceShell>
    </ApplicationProvider>
  );
}
