import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  readPreferences,
  savePreferences,
} from "../src/workspace/preferences";

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function useLocalStorage(window: Window): void {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: window.localStorage,
  });
}

afterEach(() => {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

describe("workspace theme preferences", () => {
  test("defaults to the light theme when no saved preference exists", async () => {
    const window = new Window();
    useLocalStorage(window);

    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);

    await window.happyDOM.close();
  });

  test("persists and restores a selected dark theme", async () => {
    const window = new Window();
    useLocalStorage(window);
    const preferences: Preferences = { ...DEFAULT_PREFERENCES, theme: "dark" };

    expect(savePreferences(preferences)).toBe(true);
    expect(readPreferences().theme).toBe("dark");

    await window.happyDOM.close();
  });

  test("falls back to light when stored theme data is invalid", async () => {
    const window = new Window();
    useLocalStorage(window);
    window.localStorage.setItem(
      "filika-workspace-v1",
      JSON.stringify({ ...DEFAULT_PREFERENCES, theme: "midnight" }),
    );

    expect(readPreferences().theme).toBe("light");

    await window.happyDOM.close();
  });
});
