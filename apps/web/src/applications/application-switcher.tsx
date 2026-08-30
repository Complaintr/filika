"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { applicationPath } from "@/services/applications-api";
import { useApplication } from "./application-context";

export function ApplicationSwitcher() {
  const { application, applications } = useApplication();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);
  const section = pathname.endsWith("/settings")
    ? "settings"
    : pathname.endsWith("/dashboard")
      ? "dashboard"
      : "complaints";
  return (
    <div className="application-switcher" ref={root}>
      <button
        className="workspace-switcher"
        ref={trigger}
        type="button"
        aria-label="Switch application"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span className="workspace-avatar" aria-hidden="true">
          {application?.displayName.slice(0, 1).toUpperCase() ?? "F"}
        </span>
        <span className="workspace-copy">
          <strong>{application?.displayName ?? "Your applications"}</strong>
        </span>
        <ChevronsUpDown size={15} />
      </button>
      {open && (
        <div id={id} className="application-switcher-panel">
          <span className="studio-eyebrow">Applications</span>
          <nav aria-label="Your applications">
            {applications.map((app) => (
              <Link
                key={app.slug}
                href={applicationPath(app.slug, section)}
                aria-current={app.slug === application?.slug ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="workspace-avatar" aria-hidden="true">
                  {app.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{app.displayName}</strong>
                  <small>/{app.slug}</small>
                </span>
                {app.slug === application?.slug && <Check size={16} />}
              </Link>
            ))}
          </nav>
          <Link
            className="application-create-link"
            href="/onboarding?new=1"
            onClick={() => setOpen(false)}
          >
            <Plus size={16} /> Create application
          </Link>
        </div>
      )}
    </div>
  );
}
