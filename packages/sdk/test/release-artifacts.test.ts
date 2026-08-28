import { expect, test } from "bun:test";
import inventory from "../../../docs/dependency-licenses.json";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a lockfile object");
  }
  return value as Record<string, unknown>;
}

test("dependency audit covers every locked registry version with matching integrity", async () => {
  const bytes = await Bun.file(new URL("../../../bun.lock", import.meta.url)).bytes();
  expect(new Bun.CryptoHasher("sha256").update(bytes).digest("hex")).toBe(inventory.lockfileSha256);
  const parsed: unknown = Bun.JSONC.parse(new TextDecoder().decode(bytes));
  const packages = record(record(parsed).packages);
  const locked = new Map<string, string>();
  for (const value of Object.values(packages)) {
    if (!Array.isArray(value)) throw new Error("Expected a lockfile package tuple");
    if (value.length <= 2) continue; // Local workspace references have no registry integrity.
    const resolution: unknown = value[0];
    const integrity: unknown = value.at(-1);
    if (typeof resolution !== "string" || typeof integrity !== "string") {
      throw new Error("Expected registry package identity and integrity");
    }
    if (locked.has(resolution)) expect(locked.get(resolution)).toBe(integrity);
    locked.set(resolution, integrity);
  }
  const audited = new Map<string, string>();
  for (const entry of inventory.packages) {
    const identity = `${entry.name}@${entry.version}`;
    expect(audited.has(identity)).toBe(false);
    expect(entry.license.trim()).not.toBe("");
    audited.set(identity, entry.integrity);
  }
  expect(audited).toEqual(locked);
});
