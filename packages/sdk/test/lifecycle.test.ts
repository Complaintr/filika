import { expect, test } from "bun:test";
import { INITIALIZATION_STATUSES, LIFECYCLE_TRANSITIONS } from "../src";
import { installGlobal } from "../src/global";
import { createRuntime } from "../src/runtime";

test("all lifecycle states can be disposed and only known states are reachable", () => {
  for (const state of INITIALIZATION_STATUSES) {
    expect(LIFECYCLE_TRANSITIONS[state].dispose).toBe("disposed");
    for (const destination of Object.values(LIFECYCLE_TRANSITIONS[state])) {
      expect(INITIALIZATION_STATUSES).toContain(destination);
    }
  }
});

const config = { projectKey: "demo", endpoint: "https://collector.example" };
const execute = async () => ({ code: "cancelled" as const });

test("runtime deduplicates init, protects configuration, and supports manual sessions without WebMCP", async () => {
  let registrations = 0;
  const runtime = createRuntime({
    document: {
      modelContext: {
        async registerTool() {
          registrations++;
        },
      },
    },
    execute,
  });
  const pending = runtime.init(config);
  expect(runtime.init({ ...config })).toBe(pending);
  expect(runtime.status.state).toBe("initializing");
  expect((await pending).status.state).toBe("ready");
  expect((await runtime.init(config)).code).toBe("already_initialized");
  expect((await runtime.init({ ...config, projectKey: "different" })).code).toBe(
    "configuration_conflict",
  );
  expect((await runtime.init({})).code).toBe("invalid_configuration");
  expect(runtime.status.state).toBe("ready");
  expect(registrations).toBe(1);
  const fallback = createRuntime({ document: {}, execute });
  expect((await fallback.init(config)).status.state).toBe("unsupported_browser");
  expect(fallback.session?.signal.aborted).toBe(false);
});

test("disposal aborts owned resources and late initialization cannot overwrite a fresh session", async () => {
  const gate = Promise.withResolvers<void>();
  let registrations = 0;
  const runtime = createRuntime({
    document: {
      modelContext: {
        registerTool() {
          return ++registrations === 1 ? gate.promise : Promise.resolve();
        },
      },
    },
    execute,
  });
  const old = runtime.init(config);
  const signal = runtime.session?.signal;
  await Promise.resolve();
  runtime.dispose();
  runtime.dispose();
  expect(signal?.aborted).toBe(true);
  const fresh = runtime.init(config);
  expect((await old).code).toBe("disposed");
  expect((await fresh).status.state).toBe("ready");
  gate.resolve();
  await Promise.resolve();
  expect(runtime.status.state).toBe("ready");
  expect(Object.isFrozen(runtime.status)).toBe(true);
  runtime.dispose();
});

test("duplicate global loads preserve the instance; foreign globals are never overwritten", () => {
  let created = 0;
  const factory = () => {
    created++;
    return { ...createRuntime({ document: {}, execute }), version: "0.0.0", open: execute };
  };
  const target = {};
  const first = installGlobal(target, factory);
  expect(installGlobal(target, factory)).toBe(first);
  expect(created).toBe(1);
  const foreign = { Filika: { unrelated: true } };
  expect(installGlobal(foreign, factory)).toBeNull();
  expect(foreign.Filika).toEqual({ unrelated: true });
  expect(installGlobal(Object.freeze({}), factory)).toBeNull();
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
