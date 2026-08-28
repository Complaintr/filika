export function abortScope(signals: readonly AbortSignal[]) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      stop();
      break;
    }
    signal.addEventListener("abort", stop, { once: true });
  }
  return {
    controller,
    cleanup() {
      for (const signal of signals) signal.removeEventListener("abort", stop);
    },
  };
}

/** Settle promptly even if an adapter ignores abort or never resolves. */
export function withAbort<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error("Operation stopped"));
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", stop);
    const stop = () => {
      cleanup();
      reject(new Error("Operation stopped"));
    };
    signal.addEventListener("abort", stop, { once: true });
    Promise.resolve()
      .then(() => {
        if (signal.aborted) throw new Error("Operation stopped");
        return operation();
      })
      .then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error: unknown) => {
          cleanup();
          reject(error);
        },
      );
  });
}
