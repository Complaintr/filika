"use client";

import { ChevronDown, CircleUserRound, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export interface ProfileMenuProps {
  workspaceName: string;
}

export function ProfileMenu({ workspaceName }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const initial = workspaceName.trim().slice(0, 1).toUpperCase() || "F";

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
        <CircleUserRound aria-hidden="true" />
      </button>
      {open ? (
        <div className="profile-menu" id={menuId} role="menu" aria-label="Profile">
          <div className="profile-menu-summary">
            <span className="profile-menu-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="profile-menu-identity">
              <strong>{workspaceName}</strong>
              <span>Local workspace</span>
            </span>
            <span className="profile-menu-status">
              Active
              <ChevronDown aria-hidden="true" />
            </span>
          </div>
          <div className="profile-menu-links">
            <Link role="menuitem" href="/settings#workspace-name" onClick={() => setOpen(false)}>
              <CircleUserRound aria-hidden="true" />
              <span>Manage profile</span>
            </Link>
            <Link role="menuitem" href="/settings" onClick={() => setOpen(false)}>
              <Settings aria-hidden="true" />
              <span>Settings</span>
            </Link>
          </div>
          <div className="profile-menu-footer">
            <button
              type="button"
              role="menuitem"
              disabled
              title="Sign out becomes available when account access is enabled."
            >
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
              <small>Not available</small>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
