import { autoInitialize } from "./bootstrap";
import type { FilikaConfig } from "./config";
import { installGlobal } from "./global";
import * as contracts from "./index";
import { createSdk } from "./sdk";

declare const __FILIKA_DEVELOPMENT__: boolean;

const documentSource = typeof document === "undefined" ? undefined : document;
let created = false;
const api = installGlobal(globalThis, () => {
  created = true;
  const sdk = createSdk({
    document: documentSource,
    development: typeof __FILIKA_DEVELOPMENT__ !== "undefined" && __FILIKA_DEVELOPMENT__,
  });
  const { createSdk: _factory, ...publicContracts } = contracts;
  return {
    ...publicContracts,
    ...sdk,
    get status() {
      return sdk.status;
    },
  };
});
if (created && api && documentSource) {
  // init is the runtime validation boundary for these untrusted attribute strings.
  void autoInitialize(documentSource, (config) => api.init(config as FilikaConfig));
}
