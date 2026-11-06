import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE, SORT_SPECS, searchOrClause, type EntryFilters } from "@/lib/entries/filters";
import { signImageUrls } from "@/lib/images/storage";
import { createClient } from "@/lib/supabase/server";
import { parseEntry } from "./parse";
import type { Database } from "@/types/database";
import type { Entry } from "@/types/domain";

/** Resolve signed URLs for every cover in one storage call. */
export async function withCoverUrls(supabase: SupabaseClient<Database>, entries: Entry[]): Promise<Entry[]> {
  const urls = await signImageUrls(supabase, entries.map((e) => e.cover_image_path));
  return entries.map((e) => ({ ...e, cover_url: e.cover_image_path ? (urls.get(e.cover_image_path) ?? null) : null }));
}

export type EntryPage = { entries: Entry[]; total: number; page: number; pageSize: number };

/** One page of a collection's entries, narrowed and ordered by the URL filters. */
export const listEntries = cache(async (collectionId: string, filters: EntryFilters): Promise<EntryPage> => {
  const supabase = await createClient();
  let query = supabase.from("entries").select("*", { count: "exact" }).eq("collection_id", collectionId);

  const search = searchOrClause(filters.q);
  if (search) query = query.or(search);
  if (filters.statuses.length) query = query.in("status", filters.statuses);
  if (filters.minRating !== null) query = query.gte("rating", filters.minRating);
  if (filters.favorite) query = query.eq("is_favorite", true);
  if (filters.tags.length) query = query.contains("tags", filters.tags);
  if (Object.keys(filters.attrs).length) query = query.contains("attributes", filters.attrs);

  const sort = SORT_SPECS[filters.sort];
  query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });
  if (sort.column !== "updated_at") query = query.order("updated_at", { ascending: false });
  query = query.order("id", { ascending: true });

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`Could not load entries: ${error.message}`);
  return { entries: await withCoverUrls(supabase, data.map(parseEntry)), total: count ?? data.length, page: filters.page, pageSize: PAGE_SIZE };
});

export type TagCount = { tag: string; count: number };

/** Distinct tags used in a collection, most used first (for the tag filter). */
export const listCollectionTags = cache(async (collectionId: string): Promise<TagCount[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("collection_tag_counts", { p_collection_id: collectionId });
  if (error) {
    // Older databases without migration 0004 simply get no tag filter.
    console.error("[lifolio] collection_tag_counts:", error.message);
    return [];
  }
  return data ?? [];
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
