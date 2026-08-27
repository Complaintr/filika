import { abortScope, withAbort } from "./abort";
import { FEEDBACK_LIMITS } from "./envelope";
import type { SubmissionTransport } from "./execution";
import { EXECUTION_LIMITS } from "./outcomes";
import { type FilikaExecutionOutcome, parseReceipt } from "./receipt";
import { type PreparedSubmission, submissionHeaders, withinByteLimit } from "./submission";

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
export type HttpResult =
  | { status: number; body: string }
  | { code: "aborted" | "invalid_input" | "outcome_unknown" };

export function collectorOutcome(response: HttpResult, eventId: string): FilikaExecutionOutcome {
  if ("code" in response) return { code: response.code };
  if (response.status === 201 || response.status === 200) {
    const receipt = parseReceipt(response.body, eventId);
    if (receipt && receipt.duplicate === (response.status === 200))
      return { code: "success", receipt };
    return { code: "outcome_unknown" };
  }
  // These documented statuses reject before persistence. Never forward error text.
  if ([400, 403, 413].includes(response.status)) return { code: "collector_rejected" };
  return { code: "outcome_unknown" };
}

export function createTransport(fetcher?: Fetcher, timeoutMs?: number): SubmissionTransport {
  return async (session, submission, signal) =>
    collectorOutcome(
      await requestFeedback(session.config.endpoint, submission, signal, fetcher, timeoutMs),
      submission.eventId,
    );
}

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
  let responseBody: ReadableStream<Uint8Array> | null = null;
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
      responseBody = response.body;
      if (scope.controller.signal.aborted) {
        void responseBody?.cancel().catch(() => {});
        throw new Error("Request stopped");
      }
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
    try {
      if (reader) {
        void reader.cancel().catch(() => {});
        reader.releaseLock();
      } else if (responseBody) {
        void (responseBody as ReadableStream<Uint8Array>).cancel().catch(() => {});
      }
    } catch {
      /* Cancellation/cleanup must not replace the closed result. */
    }
  }
}
