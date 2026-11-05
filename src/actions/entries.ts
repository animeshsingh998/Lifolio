"use server";

import { revalidatePath } from "next/cache";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { buildEntrySchema } from "@/lib/fields/schema";
import { parseCollection, parseFields } from "@/lib/queries/parse";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

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
  await requireUser();
  const ctx = await loadValidator(collectionId);
  if (ctx.error) return dbFail("Saving the entry", ctx.error);
  if (!ctx.collection) return fail("Collection not found.");

  const parsed = ctx.schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const { data, error } = await ctx.supabase
    .from("entries")
    .insert({
      collection_id: collectionId,
      title: v.title,
      status: v.status,
      rating: v.rating,
      occurred_on: v.occurred_on,
      notes: v.notes || null,
      tags: v.tags,
      is_favorite: v.is_favorite,
      attributes: v.attributes as Json,
    })
    .select("id")
    .single();
  if (error) return dbFail("Saving the entry", error);

  revalidateEntries();
  return ok({ id: data.id });
}

export async function updateEntry(collectionId: string, entryId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const ctx = await loadValidator(collectionId);
  if (ctx.error) return dbFail("Saving the entry", ctx.error);
  if (!ctx.collection) return fail("Collection not found.");

  const parsed = ctx.schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const { error, count } = await ctx.supabase
    .from("entries")
    .update(
      {
        title: v.title,
        status: v.status,
        rating: v.rating,
        occurred_on: v.occurred_on,
        notes: v.notes || null,
        tags: v.tags,
        is_favorite: v.is_favorite,
        attributes: v.attributes as Json,
      },
      { count: "exact" },
    )
    .eq("id", entryId)
    .eq("collection_id", collectionId);
  if (error) return dbFail("Saving the entry", error);
  if (!count) return fail("Entry not found.");

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
  const { error, count } = await supabase.from("entries").delete({ count: "exact" }).eq("id", entryId);
  if (error) return dbFail("Deleting the entry", error);
  if (!count) return fail("Entry not found.");
  revalidateEntries();
  return ok(undefined);
}
