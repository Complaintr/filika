import { abortScope, withAbort } from "./abort";
import { FEEDBACK_LIMITS } from "./envelope";
import { EXECUTION_LIMITS } from "./outcomes";
import { type PreparedSubmission, submissionHeaders, withinByteLimit } from "./submission";

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
export type HttpResult =
  | { status: number; body: string }
  | { code: "aborted" | "invalid_input" | "outcome_unknown" };

export async function requestFeedback(
  endpoint: string,
  submission: PreparedSubmission,
  signal: AbortSignal,
  fetcher: Fetcher = (input, init) => fetch(input, init),
  timeoutMs: number = EXECUTION_LIMITS.requestTimeoutMs,
): Promise<HttpResult> {
  if (signal.aborted) return { code: "aborted" };
  if (!withinByteLimit(submission.body, FEEDBACK_LIMITS.envelopeBytes))
    return { code: "invalid_input" };
  const scope = abortScope([signal]);
  const timer = setTimeout(() => scope.controller.abort(), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    return await withAbort(scope.controller.signal, async () => {
      const response = await fetcher(endpoint, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        keepalive: false,
        headers: submissionHeaders(submission),
        body: submission.body,
        signal: scope.controller.signal,
      });
      if (scope.controller.signal.aborted) throw new Error("Request stopped");
      if (
        !/^application\/json(?:\s*;\s*charset=(?:utf-8|"utf-8"))?$/iu.test(
          response.headers.get("Content-Type")?.trim() ?? "",
        )
      )
        throw new Error("Unexpected response type");
      const contentLength = response.headers.get("Content-Length");
      if (
        contentLength !== null &&
        (!/^[0-9]+$/u.test(contentLength) || Number(contentLength) > EXECUTION_LIMITS.receiptBytes)
      )
        throw new Error("Response too large");
      if (!response.body) throw new Error("Missing response body");
      reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let bytes = 0;
      let body = "";
      while (true) {
        const chunk = await withAbort(scope.controller.signal, () => {
          if (!reader) throw new Error("Missing reader");
          return reader.read();
        });
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > EXECUTION_LIMITS.receiptBytes) throw new Error("Response too large");
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
      return { status: response.status, body };
    });
  } catch {
    return { code: "outcome_unknown" };
  } finally {
    clearTimeout(timer);
    scope.controller.abort();
    scope.cleanup();
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
