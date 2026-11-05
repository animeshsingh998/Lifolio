import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseCollection, parseCollectionSummary, parseFields } from "./parse";
import type { Collection, CollectionField, CollectionSummary } from "@/types/domain";

/** All of the user's collections with entry counts, in sidebar order. Deduplicated per request. */
export const listCollections = cache(async (): Promise<CollectionSummary[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*, entries(count)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load collections: ${error.message}`);
  return data.map(parseCollectionSummary);
});

/** One collection by slug, or null. RLS limits this to the current user. */
export const getCollectionBySlug = cache(async (slug: string): Promise<Collection | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("collections").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Could not load collection: ${error.message}`);
  return data ? parseCollection(data) : null;
});

/** Custom field definitions of a collection, in display order. */
export const getCollectionFields = cache(async (collectionId: string): Promise<CollectionField[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_fields")
    .select("*")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load fields: ${error.message}`);
  return parseFields(data);
});
