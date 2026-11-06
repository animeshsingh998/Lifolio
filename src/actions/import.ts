"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { entryColumns, resolveCover } from "@/lib/entries/cover";
import { coerceForField } from "@/lib/fields/coerce";
import { buildEntrySchema } from "@/lib/fields/schema";
import { removeImages } from "@/lib/images/storage";
import { IMPORT_BATCH, RESOLVE_BATCH, looksLike, normTitle, rankCandidates } from "@/lib/import/match";
import { getProvider } from "@/lib/lookup/registry";
import type { LookupResult } from "@/lib/lookup/types";
import { parseCollection, parseFields } from "@/lib/queries/parse";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  index: z.number().int().min(0).max(5000),
  title: z.string().trim().min(1).max(200),
  rating: z.number().int().min(0).max(10).nullable(),
  year: z.number().int().min(1800).max(2100).nullable(),
  status: z.string().max(60).nullable(),
  date: z.iso.date().nullable(),
  tags: z.array(z.string().max(40)).max(30),
  notes: z.string().max(10000).nullable(),
  extra: z.record(z.string(), z.unknown()),
});
export type ImportRowInput = z.infer<typeof itemSchema>;

const lookupResultSchema = z.object({
  externalId: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(300).optional(),
  thumbnailUrl: z.url().nullable(),
  imageUrl: z.url().nullable(),
  values: z.record(z.string(), z.unknown()),
});

export type ResolvedRow = {
  index: number;
  candidates: LookupResult[];
  /** Existing entry with the same provider id or the same title. */
  duplicateOf: { id: string; title: string } | null;
  /** Top candidate's title does not look like the requested title. */
  weak: boolean;
  error?: string;
};

/** Phase A: find provider matches and duplicates for a chunk of pasted items. */
export async function resolveImportBatch(collectionId: string, input: unknown): Promise<ActionResult<ResolvedRow[]>> {
  await requireUser();
  const parsed = z.array(itemSchema).min(1).max(RESOLVE_BATCH).safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const [{ data: collection, error: cErr }, { data: existing, error: eErr }] = await Promise.all([
    supabase.from("collections").select("id, lookup_provider").eq("id", collectionId).maybeSingle(),
    supabase.from("entries").select("id, title, external_id").eq("collection_id", collectionId),
  ]);
  if (cErr || eErr) return dbFail("Preparing the import", (cErr ?? eErr)!);
  if (!collection) return fail("Collection not found.");

  const provider = getProvider(collection.lookup_provider);
  const usable = provider?.isConfigured() ? provider : null;
  const byExternal = new Map((existing ?? []).filter((e) => e.external_id).map((e) => [e.external_id!, e]));
  const byTitle = new Map((existing ?? []).map((e) => [normTitle(e.title), e]));

  const rows: ResolvedRow[] = [];
  for (const item of parsed.data) {
    let candidates: LookupResult[] = [];
    let error: string | undefined;
    if (usable) {
      try {
        candidates = rankCandidates(await usable.search(item.title), item.year);
      } catch (e) {
        error = e instanceof Error ? e.message : "Search failed";
      }
    }
    const top = candidates[0];
    const dup = (top && byExternal.get(top.externalId)) ?? byTitle.get(normTitle(item.title)) ?? null;
    rows.push({
      index: item.index,
      candidates,
      duplicateOf: dup ? { id: dup.id, title: dup.title } : null,
      weak: usable ? !top || !looksLike(item.title, top.title) : false,
      error,
    });
  }
  return ok(rows);
}

const importRowSchema = itemSchema.extend({ match: lookupResultSchema.nullable() });
const optionsSchema = z.object({
  defaultStatus: z.string().max(60).nullable(),
  createUnmatched: z.boolean(),
});

export type ImportRowResult =
  | { index: number; outcome: "created"; id: string; title: string; warning?: string }
  | { index: number; outcome: "skipped"; reason: string }
  | { index: number; outcome: "failed"; error: string };

/** Phase B: create entries for a chunk of approved rows (details + cover + insert each). */
export async function importEntryBatch(collectionId: string, input: unknown, rawOptions: unknown): Promise<ActionResult<ImportRowResult[]>> {
  const user = await requireUser();
  const parsedRows = z.array(importRowSchema).min(1).max(IMPORT_BATCH).safeParse(input);
  if (!parsedRows.success) return fromZod(parsedRows.error);
  const options = optionsSchema.safeParse(rawOptions);
  if (!options.success) return fromZod(options.error);

  const supabase = await createClient();
  const [{ data: collectionRow, error: cErr }, { data: fieldRows, error: fErr }] = await Promise.all([
    supabase.from("collections").select("*").eq("id", collectionId).maybeSingle(),
    supabase.from("collection_fields").select("*").eq("collection_id", collectionId),
  ]);
  if (cErr || fErr) return dbFail("Importing", (cErr ?? fErr)!);
  if (!collectionRow) return fail("Collection not found.");

  const collection = parseCollection(collectionRow);
  const fields = parseFields(fieldRows ?? []);
  const schema = buildEntrySchema(collection, fields);
  const provider = getProvider(collection.lookup_provider);
  const statusByKey = new Map(collection.status_options.map((s) => [s.key, s.key]));
  const statusByLabel = new Map(collection.status_options.map((s) => [s.label.toLowerCase(), s.key]));
  const resolveStatus = (s: string | null) =>
    s ? (statusByKey.get(s) ?? statusByLabel.get(s.toLowerCase()) ?? null) : null;
  const defaultStatus = resolveStatus(options.data.defaultStatus);
  const fieldByLabel = new Map(fields.map((f) => [f.label.toLowerCase(), f]));
  const fieldByKey = new Map(fields.map((f) => [f.key, f]));

  const results: ImportRowResult[] = [];
  for (const row of parsedRows.data) {
    if (!row.match && !options.data.createUnmatched) {
      results.push({ index: row.index, outcome: "skipped", reason: "No match and 'create unmatched' is off." });
      continue;
    }

    // Enrich with the provider's details when available (credits, page counts, bigger covers).
    let match = row.match;
    if (match && provider?.details) {
      try {
        match = (await provider.details(match.externalId)) ?? match;
      } catch {
        /* keep the search result */
      }
    }

    const attributes: Record<string, unknown> = {};
    if (match) {
      for (const f of fields) {
        if (!f.lookup_key || !(f.lookup_key in match.values)) continue;
        const v = coerceForField(f, match.values[f.lookup_key]);
        if (v !== null) attributes[f.key] = v;
      }
    }
    for (const [k, raw] of Object.entries(row.extra)) {
      const f = fieldByLabel.get(k.toLowerCase().trim()) ?? fieldByKey.get(k);
      if (!f) continue;
      const v = coerceForField(f, raw);
      if (v !== null) attributes[f.key] = v;
    }

    const payload = {
      title: match?.title ?? row.title,
      status: resolveStatus(row.status) ?? defaultStatus,
      rating: row.rating,
      occurred_on: row.date,
      notes: row.notes ?? "",
      tags: row.tags,
      is_favorite: false,
      attributes,
      cover: {
        path: null,
        source_url: match?.imageUrl ?? null,
        image_source: match?.imageUrl ? "provider" : null,
        external_provider: match && provider ? provider.id : null,
        external_id: match?.externalId ?? null,
      },
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      results.push({ index: row.index, outcome: "failed", error: issue?.message ?? "Invalid data." });
      continue;
    }

    let warning: string | undefined;
    let cover = await resolveCover(supabase, user.id, parsed.data.cover);
    if ("error" in cover) {
      warning = `Saved without cover: ${cover.error}`;
      cover = await resolveCover(supabase, user.id, { ...parsed.data.cover, source_url: null, image_source: null });
      if ("error" in cover) {
        results.push({ index: row.index, outcome: "failed", error: cover.error });
        continue;
      }
    }

    const { data, error } = await supabase
      .from("entries")
      .insert({ collection_id: collectionId, ...entryColumns(parsed.data), ...cover.columns })
      .select("id")
      .single();
    if (error) {
      await removeImages(supabase, [cover.columns.cover_image_path]);
      console.error("[lifolio] import insert:", error.message);
      results.push({ index: row.index, outcome: "failed", error: "Could not save this entry." });
      continue;
    }
    results.push({ index: row.index, outcome: "created", id: data.id, title: parsed.data.title, warning });
  }

  revalidatePath("/", "layout");
  return ok(results);
}
