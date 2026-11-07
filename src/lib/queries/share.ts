import "server-only";
import { cache } from "react";
import { z } from "zod";
import { signImageUrls } from "@/lib/images/storage";
import { hashShareToken, SHARE_TOKEN_RE } from "@/lib/share/token";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { parseCollection, parseEntry, parseFields } from "./parse";
import type { Tables } from "@/types/database";
import type { Collection, CollectionField, Entry } from "@/types/domain";

export type ShareLink = { id: string; expires_at: string; created_at: string };

/** Owner side: active links of a collection (not revoked, not expired), newest first. */
export const listShareLinks = cache(async (collectionId: string): Promise<ShareLink[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_shares")
    .select("id, expires_at, created_at")
    .eq("collection_id", collectionId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load share links: ${error.message}`);
  return data;
});

export type SharedCollection = {
  share: { id: string; expires_at: string };
  collection: Collection;
  fields: CollectionField[];
  entries: Entry[];
};

// The function strips user_id; the parsers expect full rows, so it is added back blank.
const payloadSchema = z.object({
  share: z.object({ id: z.string(), expires_at: z.string() }),
  collection: z.record(z.string(), z.unknown()),
  fields: z.array(z.record(z.string(), z.unknown())),
  entries: z.array(z.record(z.string(), z.unknown())),
});

/** Public side: the whole shared collection for a raw token, or null when the link is invalid, expired or revoked. */
export const getSharedCollection = cache(async (token: string): Promise<SharedCollection | null> => {
  if (!SHARE_TOKEN_RE.test(token)) return null;
  const supabase = await createPublicClient();
  const { data, error } = await supabase.rpc("shared_collection", { p_token_hash: hashShareToken(token) });
  if (error) throw new Error(`Could not load the shared collection: ${error.message}`);
  if (!data) return null;
  const parsed = payloadSchema.safeParse(data);
  if (!parsed.success) return null;

  const withUser = <T extends Record<string, unknown>>(row: T) => ({ user_id: "", ...row });
  const collection = parseCollection(withUser(parsed.data.collection) as Tables<"collections">);
  const fields = parseFields(parsed.data.fields.map((f) => withUser(f) as Tables<"collection_fields">));
  const entries = parsed.data.entries.map((e) => parseEntry(withUser(e) as Tables<"entries">));

  const urls = await signImageUrls(supabase, entries.map((e) => e.cover_image_path));
  return {
    share: parsed.data.share,
    collection,
    fields,
    entries: entries.map((e) => ({ ...e, cover_url: e.cover_image_path ? (urls.get(e.cover_image_path) ?? null) : null })),
  };
});
