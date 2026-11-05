/**
 * fetch with one retry on transport errors (connection reset, timeout) and 5xx.
 * Provider endpoints are occasionally reset by some networks; a single retry
 * turns most of those into successes without masking real outages.
 */
export async function fetchWithRetry(input: string | URL, init: RequestInit, attempts = 2, delayMs = 400): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (res.status >= 500 && i < attempts - 1) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (error) {
      lastError = error;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error("Network error");
}
