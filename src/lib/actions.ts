import type { z } from "zod";

/** Uniform Server Action result. Expected failures are values, not exceptions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = undefined>(error: string, fieldErrors?: Record<string, string>): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

/** Collapse a ZodError into {error, fieldErrors} keyed by dotted path. */
export function fromZod<T = undefined>(error: z.ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  return fail(error.issues[0]?.message ?? "Invalid input.", fieldErrors);
}

/** Hide raw database messages from users while keeping them in the server log. */
export function dbFail<T = undefined>(context: string, error: { message: string; code?: string }): ActionResult<T> {
  console.error(`[lifolio] ${context}:`, error.code ?? "", error.message);
  if (error.code === "23505") return fail("That name is already in use.");
  return fail(`${context} failed. Please try again.`);
}
