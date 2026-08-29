"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EllipsisVertical, Home, type LucideIcon, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNavBar from "@/components/ui/bottom-nav-bar";
import { ConnectionProvider, connectionLabel, useConnection } from "./connection";
import { type Preferences, readPreferences } from "./preferences";
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
  const prefersReducedMotion = useReducedMotion();
  const { state: connection } = useConnection();
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences());

  useEffect(() => {
    document.documentElement.dataset.density = preferences.density;
  }, [preferences.density]);

  useEffect(() => {
    const apply = () => setPreferences(readPreferences());
    window.addEventListener("storage", apply);
    window.addEventListener("filika:preferences", apply);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("filika:preferences", apply);
    };
  }, []);

  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => {
      if (item.href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }),
  );

  return (
    <div className="workspace-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="workspace-identity">
            <Link className="brand" href="/dashboard" aria-label="Filika dashboard">
              <span className="brand-mark" aria-hidden="true">
                <span className="sail-main" />
                <span className="sail-small" />
                <span className="sail-hull" />
              </span>
              <span className="brand-name">filika</span>
            </Link>
            <span className="identity-separator" aria-hidden="true">
              /
            </span>
            <Link className="workspace-switcher" href="/settings">
              <span className="workspace-avatar" aria-hidden="true">
                {preferences.workspaceName.slice(0, 1).toUpperCase()}
              </span>
              <span className="workspace-copy">
                <strong>{preferences.workspaceName}</strong>
              </span>
              <span className="workspace-copy-marker" aria-hidden="true">
                <EllipsisVertical />
              </span>
            </Link>
          </div>
          <div className="topbar-actions">
            <div className="connection-status" data-state={connection} role="status">
              <span className="connection-dot" />
              <span className="sr-only">{connectionLabel(connection)}</span>
            </div>
            <ProfileMenu workspaceName={preferences.workspaceName} />
          </div>
        </div>
      </header>
      <main className="workspace-content" id="app-content" tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className="workspace-page"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.997 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: -4, scale: 0.998 }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <div className="navigation-root">
        <BottomNavBar
          items={NAV_ITEMS.map((item) => ({ href: item.href, icon: item.icon, label: item.label }))}
          activeIndex={activeIndex}
          stickyBottom
        />
      </div>
    </div>
  );
}
