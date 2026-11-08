import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { statusOf } from "@/components/entries/status-badge";
import { fieldDefinitions } from "@/lib/fields/definitions";
import { createClient } from "@/lib/supabase/server";
import { parseCollection, parseEntry, parseFields } from "@/lib/queries/parse";
import { toCsv } from "./csv";
import type { Database, Tables } from "@/types/database";
import type { Collection, CollectionField, Entry } from "@/types/domain";

type Client = SupabaseClient<Database>;
const CHUNK = 1000; // PostgREST caps a single response at 1000 rows by default

/** Pull every row of a query in pages so exports are complete regardless of size. */
async function fetchAll<Row>(page: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await page(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < CHUNK) return rows;
  }
}

async function loadEntries(supabase: Client, collectionId?: string): Promise<Entry[]> {
  const rows = await fetchAll<Tables<"entries">>((from, to) => {
    let q = supabase.from("entries").select("*").order("collection_id").order("created_at", { ascending: true }).range(from, to);
    if (collectionId) q = q.eq("collection_id", collectionId);
    return q;
  });
  return rows.map(parseEntry);
}

/** Drop keys without leaving unused bindings behind. */
function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

// Drop internal-only columns; keep the storage path so a future import could re-link covers.
const publicEntry = (e: Entry) => omit(e, ["user_id", "cover_url"]);

/** Everything the user owns as one JSON document. */
export async function buildJsonExport(): Promise<string> {
  const supabase = await createClient();
  const [collectionRows, fieldRows, entries] = await Promise.all([
    fetchAll<Tables<"collections">>((from, to) => supabase.from("collections").select("*").order("sort_order").order("created_at").range(from, to)),
    fetchAll<Tables<"collection_fields">>((from, to) => supabase.from("collection_fields").select("*").order("collection_id").order("sort_order").range(from, to)),
    loadEntries(supabase),
  ]);
  const fields = parseFields(fieldRows);
  const collections = collectionRows.map(parseCollection).map((c) => ({
    ...omit(c, ["user_id"]),
    fields: fields.filter((f) => f.collection_id === c.id).map((f) => omit(f, ["user_id"])),
    entries: entries.filter((e) => e.collection_id === c.id).map(publicEntry),
  }));
  return JSON.stringify({ app: "Lifolio", version: 1, exported_at: new Date().toISOString(), collections }, null, 2);
}

/** One collection as a spreadsheet: promoted columns, then one column per custom field. */
export async function buildCsvExport(collectionId: string): Promise<{ filename: string; csv: string } | null> {
  const supabase = await createClient();
  const [{ data: collectionRow }, { data: fieldRows }] = await Promise.all([
    supabase.from("collections").select("*").eq("id", collectionId).maybeSingle(),
    supabase.from("collection_fields").select("*").eq("collection_id", collectionId).order("sort_order"),
  ]);
  if (!collectionRow) return null;
  const collection: Collection = parseCollection(collectionRow);
  const fields: CollectionField[] = parseFields(fieldRows ?? []);
  const entries = await loadEntries(supabase, collectionId);

  const headers = [
    "Title",
    "Status",
    "Rating (out of 5)",
    collection.date_label ?? "Date",
    "Tags",
    "Favourite",
    "Notes",
    ...fields.map((f) => f.label),
    "Created",
    "Updated",
  ];
  const rows = entries.map((e) => [
    e.title,
    statusOf(collection.status_options, e.status)?.label ?? "",
    e.rating === null ? "" : e.rating / 2,
    e.occurred_on ?? "",
    e.tags,
    e.is_favorite,
    e.notes ?? "",
    ...fields.map((f) => fieldDefinitions[f.type].format(e.attributes[f.key], f.options)),
    e.created_at,
    e.updated_at,
  ]);
  return { filename: `lifolio-${collection.slug}.csv`, csv: toCsv(headers, rows) };
}
