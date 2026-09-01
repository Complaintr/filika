const LOCAL_SDK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function collectorOrigin(value: string): URL {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password) {
    throw new Error("Collector origin must be an exact origin.");
  }
  const localHttp = url.protocol === "http:" && LOCAL_SDK_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Collector origin must use HTTPS outside local development.");
  }
  return url;
}

function attribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createInstallSnippet(origin: string, projectKey: string): string {
  const base = collectorOrigin(origin);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectKey)) {
    throw new Error("Invalid application key.");
  }
  const development = base.protocol === "http:";
  const source = `${base.origin}/sdk/filika${development ? ".development" : ""}.js`;
  const endpoint = `${base.origin}/api/v1/feedback`;
  return `<script
  src="${attribute(source)}"
  data-project-key="${attribute(projectKey)}"
  data-endpoint="${attribute(endpoint)}"
  defer
></script>`;
}

export function createSetupBrief(input: {
  applicationName: string;
  collectorOrigin: string;
  projectKey: string;
  websiteOrigin: string;
}): string {
  const snippet = createInstallSnippet(input.collectorOrigin, input.projectKey);
  return `Set up Filika for ${input.applicationName}

Allowed website origin: ${input.websiteOrigin}

Add this script before the closing </body> tag on every page where feedback should be available:

${snippet}

Then open ${input.websiteOrigin} in a WebMCP-enabled browser and ask the browser agent:
“Send a test feedback report through Filika.”

Review and confirm the report. Filika will mark the connection as verified when the report reaches the inbox.`;
}

export const TEST_FEEDBACK_PROMPT = "Send a test feedback report through Filika.";
