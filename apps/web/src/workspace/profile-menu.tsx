"use client";

import { Camera, CircleUserRound, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { type AccountProfile, fetchAccount, saveAccount } from "@/services/applications-api";
import { signOut } from "@/services/session";
import { readPreferences, savePreferences } from "./preferences";

export interface ProfileMenuProps {
  applicationSlug?: string | undefined;
}

type ProfileTheme = "light" | "dark" | "system";

const PREFERENCES_KEY = "filika-workspace-v1";

function readProfileTheme(): ProfileTheme {
  if (typeof window === "undefined") return "light";
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null");
    if (typeof value === "object" && value !== null && "theme" in value) {
      const storedTheme = (value as { theme?: unknown }).theme;
      if (storedTheme === "dark" || storedTheme === "system") return storedTheme;
      return "light";
    }
  } catch {
    return "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function resolvedProfileTheme(theme: ProfileTheme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyProfileTheme(theme: ProfileTheme): void {
  const resolvedTheme = resolvedProfileTheme(theme);
  document.documentElement.dataset.theme = resolvedTheme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", resolvedTheme === "dark" ? "#0e0e10" : "#f7f8fa");
}

function saveProfileTheme(theme: ProfileTheme): void {
  applyProfileTheme(theme);

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null");
    const current = typeof value === "object" && value !== null ? value : {};
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...current, theme }));
  } catch {
    // The visible theme can still change when browser storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent("filika:preferences"));
}

export function ProfileMenu({ applicationSlug }: ProfileMenuProps = {}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ProfileTheme>("light");
  const [session, setSession] = useState<AccountProfile | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetchAccount(controller.signal)
        .then((value) => {
          if (controller.signal.aborted) return;
          setSession(value);
          setImageFailed(false);
          savePreferences({ ...readPreferences(), theme: value.theme, density: value.density });
          window.dispatchEvent(new Event("filika:preferences"));
        })
        .catch(() => {
          if (!controller.signal.aborted) setSession(null);
        });
    };
    load();
    window.addEventListener("filika:account", load);
    return () => {
      controller.abort();
      window.removeEventListener("filika:account", load);
    };
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = readProfileTheme();
      setTheme(nextTheme);
      applyProfileTheme(nextTheme);
    };
    const systemTheme =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("filika:preferences", syncTheme);
    systemTheme?.addEventListener("change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("filika:preferences", syncTheme);
      systemTheme?.removeEventListener("change", syncTheme);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const displayName = session?.name?.trim() || "Your account";
  const displaySubtitle = session?.email || "Filika account";
  const avatarImage = session?.image;
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "F";

  function selectTheme(nextTheme: ProfileTheme): void {
    setTheme(nextTheme);
    saveProfileTheme(nextTheme);
    if (session) {
      void saveAccount({ theme: nextTheme }, new AbortController().signal)
        .then(setSession)
        .catch(() => {});
    }
  }

  const showAvatarImage = Boolean(avatarImage && !imageFailed);

  return (
    <div className="profile-menu-root" ref={rootRef}>
      <button
        ref={triggerRef}
        className="topbar-avatar"
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {showAvatarImage ? (
          // biome-ignore lint/performance/noImgElement: External OAuth avatar URL
          <img
            className="topbar-avatar-img"
            src={avatarImage ?? ""}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <CircleUserRound aria-hidden="true" />
        )}
      </button>
      {open ? (
        <div className="profile-menu" id={menuId} role="menu" aria-label="Profile">
          <div className="profile-menu-summary">
            <span className="profile-menu-avatar" aria-hidden="true">
              {showAvatarImage ? (
                // biome-ignore lint/performance/noImgElement: External OAuth avatar URL
                <img
                  className="profile-menu-avatar-img"
                  src={avatarImage ?? ""}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                initial
              )}
            </span>
            <span className="profile-menu-identity">
              <strong>{displayName}</strong>
              <span title={displaySubtitle}>{displaySubtitle}</span>
            </span>
          </div>
          <fieldset className="profile-theme-switcher">
            <legend className="sr-only">Appearance</legend>
            <button
              type="button"
              role="menuitemradio"
              aria-label="Light theme"
              aria-checked={theme === "light"}
              onClick={() => selectTheme("light")}
            >
              <Sun aria-hidden="true" />
              <span className="sr-only">Light</span>
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-label="Dark theme"
              aria-checked={theme === "dark"}
              onClick={() => selectTheme("dark")}
            >
              <Moon aria-hidden="true" />
              <span className="sr-only">Dark</span>
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-label="System theme"
              aria-checked={theme === "system"}
              onClick={() => selectTheme("system")}
            >
              <Monitor aria-hidden="true" />
              <span className="sr-only">System</span>
            </button>
          </fieldset>
          <div className="profile-menu-links">
            <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>
              <CircleUserRound aria-hidden="true" />
              <span>Manage profile</span>
            </Link>
            <Link role="menuitem" href="/account#profile-photo" onClick={() => setOpen(false)}>
              <Camera aria-hidden="true" />
              <span>Profile photo</span>
            </Link>
            {applicationSlug && (
              <Link
                role="menuitem"
                href={`/${applicationSlug}/settings`}
                onClick={() => setOpen(false)}
              >
                <Settings aria-hidden="true" />
                <span>Application settings</span>
              </Link>
            )}
          </div>
          <div className="profile-menu-footer">
            <button
              type="button"
              role="menuitem"
              disabled={!session}
              title={
                session ? "Sign out of your account" : "Sign out becomes available when signed in."
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void signOut();
              }}
            >
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
