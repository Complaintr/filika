"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function SettingsLayout({
  title,
  description,
  sections,
  active,
  onSelect,
  headerAction,
  children,
}: {
  title: string;
  description: string;
  sections: readonly { id: string; label: string; icon: LucideIcon; description: string }[];
  active: string;
  onSelect(id: string): void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const section = sections.find((value) => value.id === active) ?? sections[0];
  if (!section) return null;
  const Icon = section.icon;
  return (
    <div className="settings-studio">
      <header className="page-heading">
        <div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        {headerAction}
      </header>
      <div className="settings-layout">
        <aside className="settings-sidebar analytics-surface">
          <div className="analytics-surface-heading">
            <h2>{title}</h2>
          </div>
          <div className="analytics-inset settings-nav-inset">
            <nav aria-label="Settings sections">
              {sections.map(({ id, label, icon: ItemIcon }) => (
                <button
                  type="button"
                  key={id}
                  aria-current={active === id ? "page" : undefined}
                  onClick={() => onSelect(id)}
                >
                  <ItemIcon />
                  <span>{label}</span>
                  <ChevronRight />
                </button>
              ))}
            </nav>
            <Link className="settings-terms" href="/terms">
              Terms of Service ↗
            </Link>
          </div>
        </aside>
        <section className="settings-content analytics-surface">
          <div className="analytics-surface-heading">
            <h2>{section.label}</h2>
            <span>{title}</span>
          </div>
          <div className="analytics-inset settings-content-inset">
            <header className="settings-section-heading">
              <span className="settings-section-symbol">
                <Icon />
              </span>
              <div>
                <h2>{section.label}</h2>
                <p>{section.description}</p>
              </div>
            </header>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

export function SaveSettings({
  dirty,
  saving,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard(): void;
}) {
  return (
    <footer className="settings-save-bar">
      <button
        className="studio-text-button"
        type="button"
        onClick={onDiscard}
        disabled={!dirty || saving}
      >
        Discard changes
      </button>
      <div>
        <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <button
          className="studio-button studio-button-primary"
          type="submit"
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </footer>
  );
}
