import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { TIMELINE_PAGE_SIZE, type TimelineFilters } from "@/lib/timeline/params";
import { withCoverUrls } from "./entries";
import { parseEntry } from "./parse";
import type { CollectionSummary, Entry } from "@/types/domain";

export type TimelinePage = { entries: Entry[]; total: number; undated: number; years: number[] };

/** Dated entries across collections, newest first, with the year range and the count of undated entries. */
export const listTimeline = cache(async (filters: TimelineFilters, collections: CollectionSummary[]): Promise<TimelinePage> => {
  const supabase = await createClient();
  const slugToId = new Map(collections.map((c) => [c.slug, c.id]));
  const ids = filters.collections.map((s) => slugToId.get(s)).filter((id): id is string => !!id);

  let query = supabase.from("entries").select("*", { count: "exact" }).not("occurred_on", "is", null);
  if (ids.length) query = query.in("collection_id", ids);
  if (filters.year !== null) query = query.gte("occurred_on", `${filters.year}-01-01`).lte("occurred_on", `${filters.year}-12-31`);
  const from = (filters.page - 1) * TIMELINE_PAGE_SIZE;
  query = query.order("occurred_on", { ascending: false }).order("updated_at", { ascending: false }).order("id").range(from, from + TIMELINE_PAGE_SIZE - 1);

  const [pageRes, oldestRes, newestRes, undatedRes] = await Promise.all([
    query,
    supabase.from("entries").select("occurred_on").not("occurred_on", "is", null).order("occurred_on", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("entries").select("occurred_on").not("occurred_on", "is", null).order("occurred_on", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("entries").select("id", { count: "exact", head: true }).is("occurred_on", null),
  ]);
  const firstError = [pageRes.error, oldestRes.error, newestRes.error, undatedRes.error].find(Boolean);
  if (firstError) throw new Error(`Could not load the timeline: ${firstError.message}`);

  const years: number[] = [];
  if (oldestRes.data?.occurred_on && newestRes.data?.occurred_on) {
    const lo = Number(oldestRes.data.occurred_on.slice(0, 4));
    const hi = Number(newestRes.data.occurred_on.slice(0, 4));
    for (let y = hi; y >= lo && years.length < 100; y--) years.push(y);
  }

  return {
    entries: await withCoverUrls(supabase, (pageRes.data ?? []).map(parseEntry)),
    total: pageRes.count ?? 0,
    undated: undatedRes.count ?? 0,
    years,
  };
});
