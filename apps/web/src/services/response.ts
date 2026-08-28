/** Bound JSON responses before parsing, including responses without Content-Length. */
export async function readBoundedJson(response: Response, limit = 512_000): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The collector returned an empty response.");
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("The collector response is too large.");
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode()) as unknown;
  } finally {
    reader.releaseLock();
  }
}
