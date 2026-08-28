import { describe, expect, test } from "bun:test";

import { CLIENT_ADDRESS_RESOLUTION, type ClientAddressResolver } from "../src/client-address";

describe("P4-BE-08 trusted client-address resolution", () => {
  test("is a provider-neutral deployment adapter", () => {
    const resolver: ClientAddressResolver = {
      resolveClientAddress: async () => null,
    };

    expect(typeof resolver.resolveClientAddress).toBe("function");
    expect(CLIENT_ADDRESS_RESOLUTION.adapterOwnedByDeployment).toBe(true);
  });

  test("never selects a provider itself", () => {
    expect(CLIENT_ADDRESS_RESOLUTION.providerNotSelected).toBe(true);
  });
});
