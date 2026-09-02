"use client";

import {
  ArrowLeft,
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
import { useApplication } from "@/applications/application-context";
import { SaveSettings, SettingsLayout } from "@/applications/settings-layout";
import {
  type AccountProfile,
  type AccountSettings,
  applicationPath,
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
  useGithubImage: false,
};
const settings = (profile: AccountProfile): AccountSettings => ({
  name: profile.name,
  theme: profile.theme,
  density: profile.density,
  useGoogleImage: profile.useGoogleImage,
  useGithubImage: profile.useGithubImage,
});

export default function AccountPage() {
  const { returnApplication } = useApplication();
  const [active, setActive] = useState("profile");
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [draft, setDraft] = useState<AccountSettings>(initial);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const baseline = useRef<AccountSettings | null>(null);
  useEffect(() => {
    const showPhoto = () => setActive("profile");
    window.addEventListener("filika:profile-photo", showPhoto);
    window.addEventListener("hashchange", showPhoto);
    return () => {
      window.removeEventListener("filika:profile-photo", showPhoto);
      window.removeEventListener("hashchange", showPhoto);
    };
  }, []);
  useEffect(() => {
    if (account && active === "profile" && window.location.hash === "#profile-photo") {
      document.getElementById("profile-photo")?.focus();
    }
  }, [account, active]);
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
                    useGoogleImage:
                      draft.useGoogleImage === previous.useGoogleImage
                        ? next.useGoogleImage
                        : draft.useGoogleImage,
                    useGithubImage:
                      draft.useGithubImage === previous.useGithubImage
                        ? next.useGithubImage
                        : draft.useGithubImage,
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
      if (draft.useGoogleImage !== account.useGoogleImage)
        patch.useGoogleImage = draft.useGoogleImage;
      if (draft.useGithubImage !== account.useGithubImage)
        patch.useGithubImage = draft.useGithubImage;
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
                  <span className="account-avatar">
                    {account?.image && account.image !== failedImage ? (
                      // biome-ignore lint/performance/noImgElement: OAuth photo is allowlisted by the account API.
                      <img
                        src={account.image}
                        alt="Your profile"
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImage(account.image)}
                      />
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
                <div id="profile-photo" className="profile-photo-setting" tabIndex={-1}>
                  <Camera />
                  <div>
                    <h3>Profile photo</h3>
                    <p>
                      {account?.googleConnected || account?.githubConnected
                        ? "Use a photo provided by Google or GitHub when you signed in. It will appear in the header."
                        : "Sign in with Google or GitHub to use your provider profile photo. Photo uploads are not available yet."}
                    </p>
                    <label className="account-photo-choice">
                      <input
                        type="checkbox"
                        checked={draft.useGoogleImage}
                        disabled={!account?.googleImageAvailable && !draft.useGoogleImage}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            useGoogleImage: event.target.checked,
                            useGithubImage: event.target.checked ? false : draft.useGithubImage,
                          })
                        }
                      />
                      Use Google profile photo
                    </label>
                    <label className="account-photo-choice">
                      <input
                        type="checkbox"
                        checked={draft.useGithubImage}
                        disabled={!account?.githubImageAvailable && !draft.useGithubImage}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            useGithubImage: event.target.checked,
                            useGoogleImage: event.target.checked ? false : draft.useGoogleImage,
                          })
                        }
                      />
                      Use GitHub profile photo
                    </label>
                    <p className="muted">
                      When enabled, your browser loads this photo from the provider. Turn it off to
                      use your initial.
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
      )}
      <p className="settings-save-status" role="status">
        {status}
      </p>
    </SettingsLayout>
  );
}
