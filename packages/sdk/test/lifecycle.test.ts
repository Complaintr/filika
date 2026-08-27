import { expect, test } from "bun:test";
import { INITIALIZATION_STATUSES, LIFECYCLE_TRANSITIONS } from "../src";

test("all lifecycle states can be disposed and only known states are reachable", () => {
  for (const state of INITIALIZATION_STATUSES) {
    expect(LIFECYCLE_TRANSITIONS[state].dispose).toBe("disposed");
    for (const destination of Object.values(LIFECYCLE_TRANSITIONS[state])) {
      expect(INITIALIZATION_STATUSES).toContain(destination);
    }
  }
});

test("registration must settle before ready and does not retry from a live state", () => {
  expect(LIFECYCLE_TRANSITIONS.uninitialized.initialize).toBe("initializing");
  expect(LIFECYCLE_TRANSITIONS.initializing.registered).toBe("ready");
  expect(LIFECYCLE_TRANSITIONS.initializing.unsupported).toBe("unsupported_browser");
  expect(LIFECYCLE_TRANSITIONS.initializing.rejected).toBe("registration_rejected");
  for (const state of ["ready", "unsupported_browser", "registration_rejected"] as const) {
    expect(Object.keys(LIFECYCLE_TRANSITIONS[state])).toEqual(["dispose"]);
  }
  expect(LIFECYCLE_TRANSITIONS.disposed.initialize).toBe("initializing");
});
