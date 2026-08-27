export interface ClientAddressResolver {
  resolveClientAddress(request: Request): Promise<string | null>;
}
