"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Home, type LucideIcon, MessageCircle, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApplication } from "@/applications/application-context";
import { ApplicationSwitcher } from "@/applications/application-switcher";
import { FilikaBrand } from "@/components/filika-brand";
import BottomNavBar from "@/components/ui/bottom-nav-bar";
import { applicationPath } from "@/services/applications-api";
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
  const { application, applications } = useApplication();
  const navItems = application
    ? NAV_ITEMS.map((item) => ({ ...item, href: `/${application.slug}${item.href}` }))
    : [];
  const prefersReducedMotion = useReducedMotion();
  const { state: connection } = useConnection();
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences());

  useEffect(() => {
    document.documentElement.dataset.density = preferences.density;
  }, [preferences.density]);

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const theme =
        preferences.theme === "system"
          ? systemTheme.matches
            ? "dark"
            : "light"
          : preferences.theme;
      document.documentElement.dataset.theme = theme;
      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      themeColor?.setAttribute("content", theme === "dark" ? "#0e0e10" : "#f7f8fa");
    };
    applyTheme();
    if (preferences.theme !== "system") return;
    systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [preferences.theme]);

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
                application
                  ? applicationPath(application.slug, "dashboard")
                  : applications[0]
                    ? applicationPath(applications[0].slug, "dashboard")
                    : "/account"
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
            <ProfileMenu applicationSlug={application?.slug} />
          </div>
        </div>
      </header>
      <main className="workspace-content" id="app-content" tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className="workspace-page"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: -8, scale: 0.997 }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
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
