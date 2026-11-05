import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseEntry } from "./parse";
import type { Entry } from "@/types/domain";

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
  return data.map(parseEntry);
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
  return data ? parseEntry(data) : null;
});
