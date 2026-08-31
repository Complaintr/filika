"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Home, type LucideIcon, MessageCircle, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useApplication } from "@/applications/application-context";
import { ApplicationSwitcher } from "@/applications/application-switcher";
import { FilikaBrand } from "@/components/filika-brand";
import BottomNavBar from "@/components/ui/bottom-nav-bar";
import { applicationPath } from "@/services/applications-api";
import { ConnectionProvider, connectionLabel, useConnection } from "./connection";
import { ProfileMenu } from "./profile-menu";

const NAV_ITEMS: readonly { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/complaints", icon: MessageCircle, label: "Complaints" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

export interface WorkspaceShellProps {
  children: React.ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <ConnectionProvider>
      <ShellBody>{children}</ShellBody>
    </ConnectionProvider>
  );
}

function ShellBody({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const { application, returnApplication } = useApplication();
  const navItems = application
    ? NAV_ITEMS.map((item) => ({ ...item, href: `/${application.slug}${item.href}` }))
    : [];
  const prefersReducedMotion = useReducedMotion();
  const { state: connection } = useConnection();
  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => {
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }),
  );

  return (
    <div className="workspace-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="workspace-identity">
            <FilikaBrand
              href={
                returnApplication
                  ? applicationPath(returnApplication.slug, "dashboard")
                  : "/onboarding?new=1"
              }
              label="Filika dashboard"
            />
            <span className="identity-separator" aria-hidden="true">
              /
            </span>
            <ApplicationSwitcher />
          </div>
          <div className="topbar-actions">
            <div className="connection-status" data-state={connection} role="status">
              <span className="connection-dot" />
              <span className="sr-only">{connectionLabel(connection)}</span>
            </div>
            <ProfileMenu applicationSlug={returnApplication?.slug} />
          </div>
        </div>
      </header>
      <main className="workspace-content" id="app-content" tabIndex={-1}>
        <motion.div
          key={pathname}
          className="workspace-page"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.24,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {children}
        </motion.div>
      </main>
      {application && (
        <div className="navigation-root">
          <BottomNavBar
            items={navItems.map((item) => ({
              href: item.href,
              icon: item.icon,
              label: item.label,
            }))}
            activeIndex={activeIndex}
            stickyBottom
          />
        </div>
      )}
    </div>
  );
}
