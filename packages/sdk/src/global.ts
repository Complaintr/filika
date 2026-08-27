import type { FilikaPublicApi } from "./lifecycle";

const OWNER = Symbol.for("filika.sdk.instance.v1");

/** No global replacement, even for an incompatible or foreign existing value. */
export function installGlobal(
  target: object,
  create: () => FilikaPublicApi,
): FilikaPublicApi | null {
  try {
    const existing = Object.getOwnPropertyDescriptor(target, "Filika");
    const owned = Object.getOwnPropertyDescriptor(target, OWNER);
    if (existing)
      return owned?.value === existing.value && owned?.value
        ? (owned.value as FilikaPublicApi)
        : null;
    if ("Filika" in target) return null;
    const api = Object.freeze(create());
    Object.defineProperties(target, {
      Filika: { value: api, enumerable: true },
      [OWNER]: { value: api },
    });
    return api;
  } catch {
    return null;
  }
}
