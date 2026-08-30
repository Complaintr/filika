"use client";

import {
  Camera,
  Laptop,
  LogOut,
  Moon,
  Paintbrush,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { SaveSettings, SettingsLayout } from "@/applications/settings-layout";
import {
  type AccountProfile,
  type AccountSettings,
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
    description: "Your name and photo across all your applications.",
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
  useGoogleImage: false,
};
const settings = (profile: AccountProfile): AccountSettings => ({
  name: profile.name,
  theme: profile.theme,
  density: profile.density,
  useGoogleImage: profile.useGoogleImage,
});

export default function AccountPage() {
  const [active, setActive] = useState("profile");
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [draft, setDraft] = useState<AccountSettings>(initial);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const controller = useRef<AbortController | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadVersion explicitly retries the request.
  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    fetchAccount(request.signal)
      .then((value) => {
        if (!request.signal.aborted) {
          setAccount(value);
          setDraft(settings(value));
        }
      })
      .catch(() => {
        if (!request.signal.aborted) setStatus("Your account could not be loaded. Try again.");
      });
    return () => controller.current?.abort();
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
      const value = await saveAccount({ ...draft, name: draft.name.trim() }, request.signal);
      if (request.signal.aborted) return;
      setAccount(value);
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
  return (
    <SettingsLayout
      title="Account"
      description="Your identity and general preferences, shared by all your applications."
      sections={sections}
      active={active}
      onSelect={setActive}
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
      <form onSubmit={save}>
        <fieldset className="settings-form-fields" disabled={!account || saving}>
          {active === "profile" && (
            <div className="settings-section-body">
              <div className="account-profile">
                <span className="account-avatar">
                  {account?.image ? (
                    // biome-ignore lint/performance/noImgElement: Google OAuth photo is allowlisted by the account API.
                    <img src={account.image} alt="Your profile" referrerPolicy="no-referrer" />
                  ) : (
                    draft.name.slice(0, 1).toUpperCase() || <UserRound />
                  )}
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
              <div id="profile-photo" className="profile-photo-setting">
                <Camera />
                <div>
                  <h3>Profile photo</h3>
                  <p>
                    {account?.googleConnected
                      ? account.googleImageAvailable
                        ? "Use the photo provided by Google when you signed in. It will appear in the header."
                        : "Sign in with Google again to refresh your profile photo."
                      : "Sign in with Google to use your Google profile photo. Photo uploads are not available yet."}
                  </p>
                  <label className="account-photo-choice">
                    <input
                      type="checkbox"
                      checked={draft.useGoogleImage}
                      disabled={!account?.googleImageAvailable && !draft.useGoogleImage}
                      onChange={(event) =>
                        setDraft({ ...draft, useGoogleImage: event.target.checked })
                      }
                    />
                    Use Google profile photo
                  </label>
                  <p className="muted">
                    When enabled, your browser loads this photo from Google. Turn it off to use your
                    initial.
                  </p>
                </div>
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
      <p className="settings-save-status" role="status">
        {status}
      </p>
    </SettingsLayout>
  );
}
