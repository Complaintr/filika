import { CONFIG_SCRIPT_ATTRIBUTES } from "./config";

export interface ScriptDocument {
  readonly currentScript: { getAttribute(name: string): string | null } | null;
}

/** Capture currentScript synchronously; never scan other scripts or the page. */
export async function autoInitialize(
  document: ScriptDocument,
  initialize: (config: unknown) => Promise<unknown>,
): Promise<void> {
  try {
    const script = document.currentScript;
    if (!script) return;
    const config: Record<string, string> = {};
    for (const [field, attribute] of Object.entries(CONFIG_SCRIPT_ATTRIBUTES)) {
      const value = script.getAttribute(attribute);
      if (value !== null) config[field] = value;
    }
    // A script without data attributes supports later explicit initialization.
    if (Object.keys(config).length > 0) await initialize(config);
  } catch {
    // Attribute access and initialization must never break the host page.
  }
}
