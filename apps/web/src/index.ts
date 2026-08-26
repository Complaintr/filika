import { createLocalTestTool, type ModelContext } from "./webmcp-test-tool";

type WebMcpDocument = Document & {
  readonly modelContext?: ModelContext;
};

const statusElement = getRequiredElement("registration-status");
const invocationElement = getRequiredElement("invocation-count");
let invocationCount = 0;

function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);

  if (element === null) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element;
}

function setStatus(state: "failed" | "registered" | "unsupported", message: string): void {
  statusElement.dataset.state = state;
  statusElement.textContent = message;
}

async function registerLocalTestTool(): Promise<void> {
  const modelContext = (document as WebMcpDocument).modelContext;

  if (modelContext === undefined) {
    setStatus("unsupported", "WebMCP is unavailable in this browser configuration.");
    return;
  }

  const registrationController = new AbortController();
  window.addEventListener("pagehide", () => registrationController.abort(), { once: true });

  const tool = createLocalTestTool(() => {
    invocationCount += 1;
    invocationElement.textContent = String(invocationCount);
  });

  try {
    await modelContext.registerTool(tool, { signal: registrationController.signal });
    setStatus("registered", `Registered: ${tool.name}`);
  } catch (error) {
    const failureName = error instanceof DOMException ? error.name : "UnknownError";
    setStatus("failed", `Registration failed: ${failureName}`);
    console.error("WebMCP test-tool registration failed", error);
  }
}

void registerLocalTestTool();
