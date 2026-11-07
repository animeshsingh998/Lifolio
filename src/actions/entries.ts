"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { entryColumns, resolveCover } from "@/lib/entries/cover";
import { buildEntrySchema } from "@/lib/fields/schema";
import { removeImages } from "@/lib/images/storage";
import { parseCollection, parseFields } from "@/lib/queries/parse";
import { createClient } from "@/lib/supabase/server";

/** Loads the collection and its fields (RLS-scoped) and builds the validator for its entries. */
async function loadValidator(collectionId: string) {
  const supabase = await createClient();
  const [{ data: collectionRow, error: cErr }, { data: fieldRows, error: fErr }] = await Promise.all([
    supabase.from("collections").select("*").eq("id", collectionId).maybeSingle(),
    supabase.from("collection_fields").select("*").eq("collection_id", collectionId),
  ]);
  if (cErr || fErr) return { error: cErr ?? fErr! } as const;
  if (!collectionRow) return { error: null, collection: null } as const;
  const collection = parseCollection(collectionRow);
  const fields = parseFields(fieldRows ?? []);
  return { error: null, collection, schema: buildEntrySchema(collection, fields), supabase } as const;
}

function revalidateEntries() {
  // Entry counts show in the sidebar; keep it simple and refresh the app tree.
  revalidatePath("/", "layout");
}

export async function createEntry(collectionId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const ctx = await loadValidator(collectionId);
  if (ctx.error) return dbFail("Saving the entry", ctx.error);
  if (!ctx.collection) return fail("Collection not found.");

  const parsed = ctx.schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const cover = await resolveCover(ctx.supabase, user.id, parsed.data.cover);
  if ("error" in cover) return fail(cover.error, { "cover.source_url": cover.error });

  const { data, error } = await ctx.supabase
    .from("entries")
    .insert({ collection_id: collectionId, ...entryColumns(parsed.data), ...cover.columns })
    .select("id")
    .single();
  if (error) {
    await removeImages(ctx.supabase, [cover.columns.cover_image_path]);
    return dbFail("Saving the entry", error);
  }

  revalidateEntries();
  return ok({ id: data.id });
}

export async function updateEntry(collectionId: string, entryId: string, input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const ctx = await loadValidator(collectionId);
  if (ctx.error) return dbFail("Saving the entry", ctx.error);
  if (!ctx.collection) return fail("Collection not found.");

  const parsed = ctx.schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { data: existing, error: loadError } = await ctx.supabase
    .from("entries")
    .select("cover_image_path")
    .eq("id", entryId)
    .eq("collection_id", collectionId)
    .maybeSingle();
  if (loadError) return dbFail("Saving the entry", loadError);
  if (!existing) return fail("Entry not found.");

  const cover = await resolveCover(ctx.supabase, user.id, parsed.data.cover);
  if ("error" in cover) return fail(cover.error, { "cover.source_url": cover.error });

  const { error } = await ctx.supabase
    .from("entries")
    .update({ ...entryColumns(parsed.data), ...cover.columns })
    .eq("id", entryId)
    .eq("collection_id", collectionId);
  if (error) return dbFail("Saving the entry", error);

  // The previous cover is only removed once the row points elsewhere.
  if (existing.cover_image_path && existing.cover_image_path !== cover.columns.cover_image_path) {
    await removeImages(ctx.supabase, [existing.cover_image_path]);
  }

  revalidateEntries();
  return ok(undefined);
}

export async function toggleFavorite(entryId: string, isFavorite: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("entries")
    .update({ is_favorite: isFavorite }, { count: "exact" })
    .eq("id", entryId);
  if (error) return dbFail("Updating favourite", error);
  if (!count) return fail("Entry not found.");
  revalidateEntries();
  return ok(undefined);
}

export async function deleteEntry(entryId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("entries").select("cover_image_path").eq("id", entryId).maybeSingle();
  const { error, count } = await supabase.from("entries").delete({ count: "exact" }).eq("id", entryId);
  if (error) return dbFail("Deleting the entry", error);
  if (!count) return fail("Entry not found.");
  await removeImages(supabase, [existing?.cover_image_path]);
  revalidateEntries();
  return ok(undefined);
}

const ratingSchema = z.number().int().min(0).max(10).nullable();

/** Quick change from a card or row: rating only, no other column touched. */
export async function setEntryRating(entryId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase.from("entries").update({ rating: parsed.data }, { count: "exact" }).eq("id", entryId);
  if (error) return dbFail("Updating rating", error);
  if (!count) return fail("Entry not found.");
  revalidateEntries();
  return ok(undefined);
}

/** Quick status change; the key must be one of the entry's collection statuses (or null). */
export async function setEntryStatus(entryId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = z.string().max(30).nullable().safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { data: entry, error: eErr } = await supabase.from("entries").select("collection_id").eq("id", entryId).maybeSingle();
  if (eErr) return dbFail("Updating status", eErr);
  if (!entry) return fail("Entry not found.");
  if (parsed.data !== null) {
    const { data: collectionRow, error: cErr } = await supabase.from("collections").select("*").eq("id", entry.collection_id).maybeSingle();
    if (cErr) return dbFail("Updating status", cErr);
    if (!collectionRow || !parseCollection(collectionRow).status_options.some((s) => s.key === parsed.data)) {
      return fail("That status does not exist in this collection.");
    }
  }
  const { error, count } = await supabase.from("entries").update({ status: parsed.data }, { count: "exact" }).eq("id", entryId);
  if (error) return dbFail("Updating status", error);
  if (!count) return fail("Entry not found.");
  revalidateEntries();
  return ok(undefined);
}
