"use client";

import { Camera, CircleUserRound, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { type AccountProfile, fetchAccount, saveAccount } from "@/services/applications-api";
import { signOut } from "@/services/session";
import { applyPreferences, readPreferences, savePreferences } from "./preferences";

export interface ProfileMenuProps {
  applicationSlug?: string | undefined;
}

type ProfileTheme = "light" | "dark" | "system";

function saveProfileTheme(theme: ProfileTheme): void {
  const preferences = { ...readPreferences(), theme };
  savePreferences(preferences);
  applyPreferences(preferences);
  window.dispatchEvent(new Event("filika:preferences"));
}

export function ProfileMenu({ applicationSlug }: ProfileMenuProps = {}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ProfileTheme>("light");
  const [session, setSession] = useState<AccountProfile | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [themeError, setThemeError] = useState("");
  const [themeSaving, setThemeSaving] = useState(false);
  const themeRequest = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
      themeRequest.current?.abort();
      window.removeEventListener("filika:account", load);
    };
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = readPreferences().theme;
      setTheme(nextTheme);
      applyPreferences({ ...readPreferences(), theme: nextTheme });
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
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')
      ?.focus();

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

  async function selectTheme(nextTheme: ProfileTheme): Promise<void> {
    if (themeSaving || themeRequest.current) return;
    const previous = theme;
    setTheme(nextTheme);
    setThemeError("");
    saveProfileTheme(nextTheme);
    if (!session) return;
    const request = new AbortController();
    themeRequest.current = request;
    setThemeSaving(true);
    try {
      const value = await saveAccount({ theme: nextTheme }, request.signal);
      if (!request.signal.aborted) {
        setSession(value);
        window.dispatchEvent(new Event("filika:account"));
      }
    } catch {
      if (!request.signal.aborted) {
        setTheme(previous);
        saveProfileTheme(previous);
        setThemeError("Theme could not be saved. Try again.");
      }
    } finally {
      themeRequest.current = null;
      if (!request.signal.aborted) setThemeSaving(false);
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
          <span aria-hidden="true">{initial}</span>
        )}
      </button>
      {open ? (
        <div
          className="profile-menu"
          id={menuId}
          role="menu"
          aria-label="Profile"
          ref={menuRef}
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
          }}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                '[role="menuitem"], [role="menuitemradio"]',
              ),
            ).filter((item) => !item.matches(":disabled"));
            if (!items.length) return;
            event.preventDefault();
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }}
        >
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
              aria-disabled={themeSaving}
              onClick={() => void selectTheme("light")}
            >
              <Sun aria-hidden="true" />
              <span className="sr-only">Light</span>
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-label="Dark theme"
              aria-checked={theme === "dark"}
              aria-disabled={themeSaving}
              onClick={() => void selectTheme("dark")}
            >
              <Moon aria-hidden="true" />
              <span className="sr-only">Dark</span>
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-label="System theme"
              aria-checked={theme === "system"}
              aria-disabled={themeSaving}
              onClick={() => void selectTheme("system")}
            >
              <Monitor aria-hidden="true" />
              <span className="sr-only">System</span>
            </button>
          </fieldset>
          {themeError && (
            <p className="profile-menu-error" role="alert">
              {themeError}
            </p>
          )}
          <div className="profile-menu-links">
            <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>
              <CircleUserRound aria-hidden="true" />
              <span>Manage profile</span>
            </Link>
            <Link
              role="menuitem"
              href="/account#profile-photo"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event("filika:profile-photo"));
              }}
            >
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
