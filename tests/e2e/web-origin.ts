const port = process.env.E2E_WEB_PORT ?? "4173";
if (!/^[0-9]+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error("E2E_WEB_PORT must be a valid unprivileged port.");
}
export const webPort = Number(port);
export const webOrigin = `http://localhost:${webPort}`;
