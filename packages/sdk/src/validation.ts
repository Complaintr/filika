/** Copy only own enumerable data properties. Never invoke caller accessors. */
export function closedRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) return null;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !keys.includes(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

export function boundedString(value: unknown, max: number, nonBlank = false): value is string {
  if (typeof value !== "string" || value.length > max * 2) return false;
  let length = 0;
  for (const point of value) {
    const unit = point.charCodeAt(0);
    if (point.length === 1 && unit >= 0xd800 && unit <= 0xdfff) return false;
    if (++length > max) return false;
  }
  return !nonBlank || /\S/u.test(value);
}
