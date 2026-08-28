/**
 * Trusted client-address resolution is a deployment adapter. Operators provide
 * an implementation that maps a request to a trusted client address when the
 * collector runs behind a proxy; the collector never selects or configures a
 * provider itself. Returning null means the address could not be resolved.
 */
export interface ClientAddressResolver {
  resolveClientAddress(request: Request): Promise<string | null>;
}

export const CLIENT_ADDRESS_RESOLUTION = {
  adapterOwnedByDeployment: true,
  providerNotSelected: true,
} as const;
