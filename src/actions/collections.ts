"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { blankStatusOptions, getTemplate } from "@/lib/collections/templates";
import { collectionSettingsSchema, createCollectionSchema } from "@/lib/collections/schemas";
import { uniqueSlug } from "@/lib/collections/slug";
import { parseStatusOptions } from "@/lib/queries/parse";
import { createClient } from "@/lib/supabase/server";
import type { Layout } from "@/types/domain";

function revalidateCollections() {
  // Collections appear in the sidebar on every (app) page.
  revalidatePath("/", "layout");
}

export async function createCollection(input: unknown): Promise<ActionResult<{ slug: string }>> {
  await requireUser();
  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data: existing, error: slugError } = await supabase.from("collections").select("slug");
  if (slugError) return dbFail("Creating the collection", slugError);

  const template = parsed.data.template === "blank" ? null : getTemplate(parsed.data.template);
  const slug = uniqueSlug(parsed.data.name, existing.map((c) => c.slug));

  const { data: collection, error } = await supabase
    .from("collections")
    .insert({
      name: parsed.data.name,
      slug,
      description: template?.description ?? null,
      icon: template?.icon ?? "folder",
      item_noun: template?.itemNoun ?? "item",
      status_options: template?.statusOptions ?? blankStatusOptions,
      date_label: template ? template.dateLabel : "Date",
      show_rating: template?.showRating ?? true,
      lookup_provider: template?.lookupProvider ?? null,
      sort_order: existing.length,
    })
    .select("id, slug")
    .single();
  if (error) return dbFail("Creating the collection", error);

  if (template && template.fields.length > 0) {
    const { error: fieldsError } = await supabase.from("collection_fields").insert(
      template.fields.map((f, i) => ({
        collection_id: collection.id,
        key: f.key,
        label: f.label,
        type: f.type,
        options: f.options ?? {},
        required: f.required ?? false,
        show_in_card: f.showInCard ?? false,
        lookup_key: f.lookupKey ?? null,
        sort_order: i,
      })),
    );
    if (fieldsError) {
      await supabase.from("collections").delete().eq("id", collection.id);
      return dbFail("Creating the collection's fields", fieldsError);
    }
  }

  revalidateCollections();
  return ok({ slug: collection.slug });
}

export async function updateCollectionSettings(collectionId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = collectionSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: current, error: loadError } = await supabase
    .from("collections")
    .select("status_options")
    .eq("id", collectionId)
    .maybeSingle();
  if (loadError) return dbFail("Saving the collection", loadError);
  if (!current) return fail("Collection not found.");

  const { error } = await supabase
    .from("collections")
    .update({
      name: v.name,
      description: v.description || null,
      icon: v.icon,
      item_noun: v.item_noun,
      show_rating: v.show_rating,
      date_label: v.date_enabled ? v.date_label || "Date" : null,
      default_layout: v.default_layout,
      status_options: v.status_options,
    })
    .eq("id", collectionId);
  if (error) return dbFail("Saving the collection", error);

  // Entries pointing at a removed status lose it (they become "no status").
  const kept = new Set(v.status_options.map((s) => s.key));
  const removed = parseStatusOptions(current.status_options)
    .map((s) => s.key)
    .filter((k) => !kept.has(k));
  if (removed.length > 0) {
    const { error: clearError } = await supabase
      .from("entries")
      .update({ status: null })
      .eq("collection_id", collectionId)
      .in("status", removed);
    if (clearError) return dbFail("Clearing removed statuses", clearError);
  }

  revalidateCollections();
  return ok(undefined);
}

export async function setCollectionLayout(collectionId: string, layout: Layout): Promise<ActionResult> {
  await requireUser();
  if (layout !== "grid" && layout !== "list") return fail("Invalid layout.");
  const supabase = await createClient();
  const { error } = await supabase.from("collections").update({ default_layout: layout }).eq("id", collectionId);
  if (error) return dbFail("Saving the layout", error);
  revalidateCollections();
  return ok(undefined);
}

export async function deleteCollection(collectionId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase.from("collections").delete({ count: "exact" }).eq("id", collectionId);
  if (error) return dbFail("Deleting the collection", error);
  if (!count) return fail("Collection not found.");
  revalidateCollections();
  redirect("/collections");
}
