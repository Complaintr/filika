"use client";

import { usePathname } from "next/navigation";
import { WorkspaceShell } from "./workspace-shell";

const STANDALONE_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
]);

/**
 * Renders the workspace shell (topbar and bottom navigation) for workspace
 * pages. Standalone paths such as the login page render their children without
 * the shell.
 */
export function AuthAwareShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = STANDALONE_PATHS.has(pathname);

  if (standalone) {
    return <>{children}</>;
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
