"use client";

import {
  ArrowLeft,
  FolderX,
  Laptop,
  LogOut,
  MessageSquareX,
  Moon,
  Paintbrush,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useApplication } from "@/applications/application-context";
import { SaveSettings, SettingsLayout } from "@/applications/settings-layout";
import {
  type AccountProfile,
  type AccountSettings,
  applicationPath,
  deleteAccount,
  fetchAccount,
  saveAccount,
} from "@/services/applications-api";
import { signOut } from "@/services/session";
import { readPreferences, savePreferences } from "@/workspace/preferences";

const sections = [
  {
    id: "profile",
    label: "Profile",
    icon: UserRound,
    description: "Your name across all your applications.",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Paintbrush,
    description: "Account-wide theme and inbox spacing.",
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    description: "Your sign-in details and account access.",
  },
];
const initial: AccountSettings = {
  name: "",
  theme: "light",
  density: "comfortable",
};
const settings = (profile: AccountProfile): AccountSettings => ({
  name: profile.name,
  theme: profile.theme,
  density: profile.density,
});

export default function AccountPage() {
  const { returnApplication } = useApplication();
  const [active, setActive] = useState("profile");
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [draft, setDraft] = useState<AccountSettings>(initial);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const baseline = useRef<AccountSettings | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadVersion explicitly retries the request.
  useEffect(() => {
    let request: AbortController;
    const load = () => {
      request?.abort();
      request = new AbortController();
      const current = request;
      fetchAccount(current.signal)
        .then((value) => {
          if (!current.signal.aborted) {
            const previous = baseline.current;
            const next = settings(value);
            baseline.current = next;
            setAccount(value);
            setDraft((draft) =>
              previous
                ? {
                    name: draft.name === previous.name ? next.name : draft.name,
                    theme: draft.theme === previous.theme ? next.theme : draft.theme,
                    density: draft.density === previous.density ? next.density : draft.density,
                  }
                : next,
            );
          }
        })
        .catch(() => {
          if (!current.signal.aborted) setStatus("Your account could not be loaded. Try again.");
        });
    };
    load();
    window.addEventListener("filika:account", load);
    return () => {
      request.abort();
      controller.current?.abort();
      window.removeEventListener("filika:account", load);
    };
  }, [loadVersion]);
  const dirty = account !== null && JSON.stringify(draft) !== JSON.stringify(settings(account));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!account || saving) return;
    if (!draft.name.trim()) {
      setStatus("Enter your name before saving.");
      setActive("profile");
      return;
    }
    setSaving(true);
    setStatus("");
    const request = new AbortController();
    controller.current = request;
    try {
      const patch: Partial<AccountSettings> = {};
      if (draft.name.trim() !== account.name) patch.name = draft.name.trim();
      if (draft.theme !== account.theme) patch.theme = draft.theme;
      if (draft.density !== account.density) patch.density = draft.density;
      if (!Object.keys(patch).length) {
        setDraft(settings(account));
        return;
      }
      const value = await saveAccount(patch, request.signal);
      if (request.signal.aborted) return;
      setAccount(value);
      baseline.current = settings(value);
      setDraft(settings(value));
      savePreferences({ ...readPreferences(), theme: value.theme, density: value.density });
      window.dispatchEvent(new Event("filika:preferences"));
      window.dispatchEvent(new Event("filika:account"));
      setStatus("Your changes are saved.");
    } catch (error) {
      if (!request.signal.aborted)
        setStatus(error instanceof Error ? error.message : "Changes could not be saved.");
    } finally {
      if (!request.signal.aborted) setSaving(false);
    }
  }
  async function removeAccount(): Promise<void> {
    if (!account || deleting) return;
    setDeleting(true);
    setDeleteError("");
    const request = new AbortController();
    controller.current = request;
    try {
      await deleteAccount(request.signal);
      if (request.signal.aborted) return;
      // biome-ignore lint/suspicious/noDocumentCookie: Clear the session cookie after account deletion.
      document.cookie =
        "better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      // biome-ignore lint/suspicious/noDocumentCookie: Clear the secure session cookie after account deletion.
      document.cookie =
        "__Secure-better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      window.location.assign("/");
    } catch (error) {
      if (!request.signal.aborted)
        setDeleteError(
          error instanceof Error
            ? error.message
            : "Your account could not be deleted. Please try again.",
        );
    } finally {
      if (!request.signal.aborted) setDeleting(false);
    }
  }
  return (
    <SettingsLayout
      title="Account"
      description="Your identity and general preferences, shared by all your applications."
      sections={sections}
      active={active}
      onSelect={setActive}
      headerAction={
        <Link
          className="studio-button account-back-link"
          href={
            returnApplication
              ? applicationPath(returnApplication.slug, "complaints")
              : "/onboarding?new=1"
          }
        >
          <ArrowLeft aria-hidden="true" />
          <span>
            {returnApplication ? `Back to ${returnApplication.displayName}` : "Create application"}
          </span>
        </Link>
      }
    >
      {!account && !status && <p role="status">Loading your account…</p>}
      {!account && status && (
        <button
          className="studio-button"
          type="button"
          onClick={() => {
            setStatus("");
            setLoadVersion((value) => value + 1);
          }}
        >
          Try again
        </button>
      )}
      {account && (
        <form onSubmit={save}>
          <fieldset className="settings-form-fields" disabled={!account || saving}>
            {active === "profile" && (
              <div className="settings-section-body">
                <div className="account-profile">
                  <span className="account-avatar" aria-hidden="true">
                    {draft.name.slice(0, 1).toUpperCase() || <UserRound />}
                  </span>
                  <div>
                    <h3>{account?.name ?? "Your profile"}</h3>
                    <p>{account?.email}</p>
                  </div>
                </div>
                <div className="studio-setting">
                  <label htmlFor="account-name">
                    Your name<span>Shown in your profile menu.</span>
                  </label>
                  <input
                    className="studio-input"
                    id="account-name"
                    value={draft.name}
                    maxLength={100}
                    required
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </div>
              </div>
            )}
            {active === "appearance" && (
              <div className="settings-section-body">
                <fieldset className="studio-fieldset">
                  <legend>Color theme</legend>
                  <p>Choose a look, or follow your device’s setting.</p>
                  <div className="appearance-choices">
                    {(
                      [
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Laptop },
                      ] as const
                    ).map(({ value, label, icon: Icon }) => (
                      <label key={value} className={`appearance-choice appearance-${value}`}>
                        <input
                          type="radio"
                          name="theme"
                          value={value}
                          checked={draft.theme === value}
                          onChange={() => setDraft({ ...draft, theme: value })}
                        />
                        <span className="appearance-mini" aria-hidden="true">
                          <span className="appearance-mini-sidebar" />
                          <span className="appearance-mini-body">
                            <i />
                            <i />
                            <i />
                          </span>
                        </span>
                        <span className="appearance-choice-label">
                          <Icon />
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="studio-fieldset">
                  <legend>Inbox spacing</legend>
                  <div className="density-choices">
                    {(["comfortable", "compact"] as const).map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="density"
                          checked={draft.density === value}
                          onChange={() => setDraft({ ...draft, density: value })}
                        />
                        <span className={`density-lines density-${value}`} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <strong>{value === "compact" ? "Compact" : "Comfortable"}</strong>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            {active === "security" && (
              <div className="settings-section-body">
                <div className="settings-info-row">
                  <div>
                    <h3>Email address</h3>
                    <p>Your identity for signing in to Filika.</p>
                  </div>
                  <span>{account?.email}</span>
                </div>
                <div className="settings-info-row">
                  <div>
                    <h3>Password & recovery</h3>
                    <p>Request a secure link to set a new password.</p>
                  </div>
                  <Link className="studio-button" href="/forgot-password">
                    Reset password
                  </Link>
                </div>
                <div className="settings-info-row">
                  <div>
                    <h3>End this session</h3>
                    <p>You can sign in again whenever you’re ready.</p>
                  </div>
                  <button className="studio-button" type="button" onClick={() => void signOut()}>
                    <LogOut />
                    Sign out
                  </button>
                </div>
                <div className="settings-info-row">
                  <div>
                    <h3>Delete account</h3>
                    <p>
                      Permanently removes your account, applications, and every piece of feedback.
                      This cannot be undone.
                    </p>
                  </div>
                  <button
                    className="studio-button studio-button-danger"
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setDeleteOpen(true);
                      setDeleteConfirm("");
                      setDeleteError("");
                    }}
                  >
                    <Trash2 />
                    Delete account
                  </button>
                </div>
                {deleteOpen && (
                  <div className="delete-account-panel" aria-labelledby="delete-account-title">
                    <div className="delete-account-panel-heading">
                      <span className="delete-account-icon" aria-hidden="true">
                        <Trash2 />
                      </span>
                      <div>
                        <h3 id="delete-account-title">Delete your account?</h3>
                        <p>This is permanent and cannot be undone.</p>
                      </div>
                    </div>
                    <ul className="delete-account-impact" aria-label="What gets removed">
                      <li>
                        <UserX aria-hidden="true" />
                        <span>
                          <strong>Your profile</strong>
                          <small>Name, email, and sign-in</small>
                        </span>
                      </li>
                      <li>
                        <FolderX aria-hidden="true" />
                        <span>
                          <strong>Your applications</strong>
                          <small>Every application you own</small>
                        </span>
                      </li>
                      <li>
                        <MessageSquareX aria-hidden="true" />
                        <span>
                          <strong>All feedback</strong>
                          <small>Reports they received, for good</small>
                        </span>
                      </li>
                    </ul>
                    <label className="delete-account-confirm-label" htmlFor="delete-account-confirm">
                      Type <strong>delete</strong> to confirm
                    </label>
                    <input
                      id="delete-account-confirm"
                      className="studio-input"
                      value={deleteConfirm}
                      maxLength={20}
                      autoComplete="off"
                      placeholder="delete"
                      disabled={deleting}
                      autoFocus
                      onChange={(event) => setDeleteConfirm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (deleteConfirm.trim().toLowerCase() === "delete") void removeAccount();
                        }
                      }}
                    />
                    {deleteError && (
                      <p className="delete-account-error" role="alert">
                        {deleteError}
                      </p>
                    )}
                    <div className="delete-account-actions">
                      <button
                        className="studio-text-button"
                        type="button"
                        disabled={deleting}
                        onClick={() => {
                          setDeleteOpen(false);
                          setDeleteConfirm("");
                          setDeleteError("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="studio-button delete-account-confirm-button"
                        type="button"
                        disabled={deleting || deleteConfirm.trim().toLowerCase() !== "delete"}
                        onClick={() => void removeAccount()}
                      >
                        {deleting ? "Deleting…" : "Delete my account"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {active !== "security" && (
              <SaveSettings
                dirty={dirty}
                saving={saving}
                onDiscard={() => {
                  if (account) setDraft(settings(account));
                  setStatus("");
                }}
              />
            )}
          </fieldset>
        </form>
      )}
      <p className="settings-save-status" role="status">
        {status}
      </p>
    </SettingsLayout>
  );
}
