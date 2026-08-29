"use client";

import {
  EllipsisVertical,
  Home,
  type LucideIcon,
  MessageCircle,
  Settings,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNavBar from "@/components/ui/bottom-nav-bar";
import { ConnectionProvider, connectionLabel, useConnection } from "./connection";
import { type Preferences, readPreferences } from "./preferences";

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
            <a className="brand" href="/dashboard" aria-label="Filika dashboard">
              <span className="brand-mark" aria-hidden="true">
                <span className="sail-main" />
                <span className="sail-small" />
                <span className="sail-hull" />
              </span>
              <span className="brand-name">filika</span>
            </a>
            <span className="identity-separator" aria-hidden="true">
              /
            </span>
            <a className="workspace-switcher" href="/settings">
              <span className="workspace-avatar" aria-hidden="true">
                {preferences.workspaceName.slice(0, 1).toUpperCase()}
              </span>
              <span className="workspace-copy">
                <strong>{preferences.workspaceName}</strong>
              </span>
              <span className="workspace-copy-marker" aria-hidden="true">
                <EllipsisVertical />
              </span>
            </a>
          </div>
          <div className="topbar-actions">
            <div className="connection-status" data-state={connection} role="status">
              <span className="connection-dot" />
              <span className="sr-only">{connectionLabel(connection)}</span>
            </div>
            <a className="topbar-avatar" href="/settings" aria-label="Workspace settings">
              <UserRound aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>
      <main className="workspace-content" id="app-content" tabIndex={-1}>
        {children}
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
