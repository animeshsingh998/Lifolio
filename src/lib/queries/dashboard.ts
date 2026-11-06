import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listCollections } from "./collections";
import { withCoverUrls } from "./entries";
import { parseEntry, parseFields } from "./parse";
import type { ActivityLog, CollectionField, CollectionSummary, Entry } from "@/types/domain";

export type CollectionStats = {
  total: number;
  favourites: number;
  added30d: number;
  avgRating: number | null;
  /** status key ("" = no status) → count */
  statusCounts: Record<string, number>;
};

export type DashboardData = {
  collections: CollectionSummary[];
  stats: Map<string, CollectionStats>;
  totals: { entries: number; collections: number; added30d: number; favourites: number };
  recent: Entry[];
  tracking: Entry[];
  activity: ActivityLog[];
  fieldsByCollection: Map<string, CollectionField[]>;
};

export const RECENT_LIMIT = 8;
export const TRACKING_LIMIT = 8;
export const ACTIVITY_LIMIT = 15;

function parseStatusCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** Everything the dashboard shows, fetched in parallel. Cheap at personal scale (a handful of queries). */
export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const [collections, supabase] = await Promise.all([listCollections(), createClient()]);

  // Statuses of kind "active" per collection → "currently tracking" filter.
  const trackingClause = collections
    .flatMap((c) => {
      const keys = c.status_options.filter((s) => s.kind === "active").map((s) => s.key);
      return keys.length ? [`and(collection_id.eq.${c.id},status.in.(${keys.join(",")}))`] : [];
    })
    .join(",");

  const [statsRes, recentRes, trackingRes, activityRes, fieldsRes] = await Promise.all([
    supabase.rpc("collection_stats"),
    supabase.from("entries").select("*").order("created_at", { ascending: false }).limit(RECENT_LIMIT),
    trackingClause
      ? supabase.from("entries").select("*").or(trackingClause).order("updated_at", { ascending: false }).limit(TRACKING_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(ACTIVITY_LIMIT),
    supabase.from("collection_fields").select("*").order("sort_order", { ascending: true }),
  ]);
  const firstError = [statsRes.error, recentRes.error, trackingRes.error, activityRes.error, fieldsRes.error].find(Boolean);
  if (firstError) throw new Error(`Could not load the dashboard: ${firstError.message}`);

  const stats = new Map<string, CollectionStats>();
  for (const row of statsRes.data ?? []) {
    stats.set(row.collection_id, {
      total: Number(row.total),
      favourites: Number(row.favourites),
      added30d: Number(row.added_30d),
      avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
      statusCounts: parseStatusCounts(row.status_counts),
    });
  }
  const totals = { entries: 0, collections: collections.length, added30d: 0, favourites: 0 };
  for (const s of stats.values()) {
    totals.entries += s.total;
    totals.added30d += s.added30d;
    totals.favourites += s.favourites;
  }

  const fieldsByCollection = new Map<string, CollectionField[]>();
  for (const f of parseFields(fieldsRes.data ?? [])) {
    fieldsByCollection.set(f.collection_id, [...(fieldsByCollection.get(f.collection_id) ?? []), f]);
  }

  // Sign covers for both strips in one storage call.
  const recentRaw = (recentRes.data ?? []).map(parseEntry);
  const trackingRaw = (trackingRes.data ?? []).map(parseEntry);
  const signed = await withCoverUrls(supabase, [...recentRaw, ...trackingRaw]);

  return {
    collections,
    stats,
    totals,
    recent: signed.slice(0, recentRaw.length),
    tracking: signed.slice(recentRaw.length),
    activity: activityRes.data ?? [],
    fieldsByCollection,
  };
});
