import "server-only";
import { cache } from "react";
import { searchOrClause } from "@/lib/entries/filters";
import { createClient } from "@/lib/supabase/server";
import { listCollections } from "./collections";
import { withCoverUrls } from "./entries";
import { parseEntry } from "./parse";
import type { CollectionSummary, Entry } from "@/types/domain";

export type SearchHit = { entry: Entry; collection: CollectionSummary };

export const SEARCH_PAGE_LIMIT = 100;

/** Entries across all of the user's collections whose title, notes or tags match `q`. */
export const searchEntries = cache(async (q: string, limit: number): Promise<SearchHit[]> => {
  const clause = searchOrClause(q);
  if (!clause) return [];
  const [collections, supabase] = await Promise.all([listCollections(), createClient()]);
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .or(clause)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);

  const byId = new Map(collections.map((c) => [c.id, c]));
  const entries = await withCoverUrls(supabase, data.map(parseEntry));
  return entries.flatMap((entry) => {
    const collection = byId.get(entry.collection_id);
    return collection ? [{ entry, collection }] : [];
  });
});
