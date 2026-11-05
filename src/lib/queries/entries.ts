import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signImageUrls } from "@/lib/images/storage";
import { createClient } from "@/lib/supabase/server";
import { parseEntry } from "./parse";
import type { Database } from "@/types/database";
import type { Entry } from "@/types/domain";

/** Resolve signed URLs for every cover in one storage call. */
async function withCoverUrls(supabase: SupabaseClient<Database>, entries: Entry[]): Promise<Entry[]> {
  const urls = await signImageUrls(supabase, entries.map((e) => e.cover_image_path));
  return entries.map((e) => ({ ...e, cover_url: e.cover_image_path ? (urls.get(e.cover_image_path) ?? null) : null }));
}

/** Phase 2: newest first, capped. Search, filters, sort and paging arrive in Phase 3. */
export const ENTRY_PAGE_LIMIT = 500;

export const listEntries = cache(async (collectionId: string): Promise<Entry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("collection_id", collectionId)
    .order("updated_at", { ascending: false })
    .limit(ENTRY_PAGE_LIMIT);
  if (error) throw new Error(`Could not load entries: ${error.message}`);
  return withCoverUrls(supabase, data.map(parseEntry));
});

export const getEntry = cache(async (collectionId: string, entryId: string): Promise<Entry | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("collection_id", collectionId)
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw new Error(`Could not load entry: ${error.message}`);
  if (!data) return null;
  const [entry] = await withCoverUrls(supabase, [parseEntry(data)]);
  return entry;
});
