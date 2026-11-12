import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWithRetry } from "@/lib/lookup/fetch-retry";
import { processCoverImage } from "./process";
import type { Database } from "@/types/database";

export const IMAGE_BUCKET = "entry-images";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const SIGNED_URL_TTL = 60 * 60; // 1 hour
/** Processed covers live under <user>/c/; anything else in the bucket predates processing. */
export const PROCESSED_FOLDER = "c";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
export const ALLOWED_IMAGE_TYPES = Object.keys(EXT);

type Client = SupabaseClient<Database>;

/** Only public http(s) hosts; blocks the obvious loopback / private ranges (single-user app, belt and braces). */
export function isSafeRemoteUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  if (host === "::1" || host.startsWith("[")) return false;
  return true;
}

export async function fetchRemoteImage(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (!isSafeRemoteUrl(url)) throw new Error("That image URL is not allowed.");
  const res = await fetchWithRetry(url, {
    headers: { accept: "image/*", "user-agent": "Lifolio/1.0 (+personal archive)" },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`The image could not be downloaded (HTTP ${res.status}).`);
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!EXT[contentType]) throw new Error("That URL is not a JPEG, PNG, WebP, GIF or AVIF image.");
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) throw new Error("The image is larger than 8 MB.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("The image is larger than 8 MB.");
  if (bytes.byteLength === 0) throw new Error("The image was empty.");
  return { bytes, contentType };
}

export function isProcessedPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/${PROCESSED_FOLDER}/`);
}

/**
 * Resizes to a web-sized WebP and uploads it under the user's folder; returns the storage path.
 * Covers are served as-is from the bucket (no per-request optimisation), so this is the only resize.
 */
export async function uploadImage(supabase: Client, userId: string, bytes: Uint8Array | File, contentType: string): Promise<string> {
  if (!EXT[contentType]) throw new Error("Unsupported image type.");
  const input = bytes instanceof Uint8Array ? bytes : await bytes.arrayBuffer();
  let processed;
  try {
    processed = await processCoverImage(input);
  } catch (error) {
    console.error("[lifolio] process image:", error);
    throw new Error("That file could not be read as an image.");
  }
  const path = `${userId}/${PROCESSED_FOLDER}/${randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, processed.bytes, { contentType: processed.contentType, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** Downloads an existing object (RLS applies) as bytes. */
export async function downloadImage(supabase: Client, path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(path);
  if (error || !data) throw new Error(`Download failed: ${error?.message ?? "no data"}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function storeImageFromUrl(supabase: Client, userId: string, url: string): Promise<string> {
  const { bytes, contentType } = await fetchRemoteImage(url);
  return uploadImage(supabase, userId, bytes, contentType);
}

/** Best effort; a failed delete must never fail the user's action. */
export async function removeImages(supabase: Client, paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(list);
  if (error) console.error("[lifolio] remove images:", error.message);
}

/** Signed URLs for a set of paths; missing/failed paths map to null. */
export async function signImageUrls(supabase: Client, paths: (string | null)[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error) {
    console.error("[lifolio] sign urls:", error.message);
    return map;
  }
  for (const item of data) if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  return map;
}

export async function signImageUrl(supabase: Client, path: string | null): Promise<string | null> {
  if (!path) return null;
  const map = await signImageUrls(supabase, [path]);
  return map.get(path) ?? null;
}
