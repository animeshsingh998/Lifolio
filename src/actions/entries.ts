"use server";

import { revalidatePath } from "next/cache";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { buildEntrySchema, type EntryFormOutput } from "@/lib/fields/schema";
import { removeImages, storeImageFromUrl } from "@/lib/images/storage";
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

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Turns the form's cover state into the columns to store. Downloads a remote
 * image into the bucket when `source_url` is set. Returns an error message on failure.
 */
async function resolveCover(
  supabase: Supabase,
  user: CurrentUser,
  cover: EntryFormOutput["cover"],
): Promise<{ error: string } | { columns: CoverColumns }> {
  let path = cover.path;
  let source = cover.image_source;

  if (path && !path.startsWith(`${user.id}/`)) return { error: "That image does not belong to you." };

  if (cover.source_url) {
    try {
      path = await storeImageFromUrl(supabase, user.id, cover.source_url);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not download the image." };
    }
    source = cover.image_source === "provider" ? "provider" : "url";
  }

  if (!path) return { columns: { cover_image_path: null, image_source: null, external_provider: null, external_id: null } };
  return {
    columns: {
      cover_image_path: path,
      image_source: source ?? "upload",
      external_provider: cover.external_provider,
      external_id: cover.external_provider ? cover.external_id : null,
    },
  };
}

type CoverColumns = {
  cover_image_path: string | null;
  image_source: "upload" | "url" | "provider" | null;
  external_provider: string | null;
  external_id: string | null;
};

function entryColumns(v: EntryFormOutput) {
  return {
    title: v.title,
    status: v.status,
    rating: v.rating,
    occurred_on: v.occurred_on,
    notes: v.notes || null,
    tags: v.tags,
    is_favorite: v.is_favorite,
    attributes: v.attributes as Json,
  };
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

  const cover = await resolveCover(ctx.supabase, user, parsed.data.cover);
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

  const cover = await resolveCover(ctx.supabase, user, parsed.data.cover);
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
