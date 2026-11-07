import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** 24 random bytes → 32 URL-safe characters. */
export function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export { SHARE_DURATIONS, type ShareHours } from "./durations";
