"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { fieldFormSchema, toFieldOptions } from "@/lib/collections/schemas";
import { newFieldKey } from "@/lib/collections/slug";
import { createClient } from "@/lib/supabase/server";

const MAX_FIELDS = 40;

export async function addField(collectionId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = fieldFormSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("collection_fields")
    .select("key, sort_order")
    .eq("collection_id", collectionId);
  if (loadError) return dbFail("Adding the field", loadError);
  if (existing.length >= MAX_FIELDS) return fail(`A collection can have at most ${MAX_FIELDS} fields.`);

  const taken = new Set(existing.map((f) => f.key));
  let key = newFieldKey();
  while (taken.has(key)) key = newFieldKey();

  const { data, error } = await supabase
    .from("collection_fields")
    .insert({
      collection_id: collectionId,
      key,
      label: v.label,
      type: v.type,
      options: toFieldOptions(v),
      required: v.required,
      show_in_card: v.show_in_card,
      sort_order: existing.reduce((m, f) => Math.max(m, f.sort_order), -1) + 1,
    })
    .select("id")
    .single();
  if (error) return dbFail("Adding the field", error);

  revalidatePath("/collections", "layout");
  return ok({ id: data.id });
}

/** Label, options and flags can change; `type` and `key` are immutable (see ARCHITECTURE §4). */
export async function updateField(fieldId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = fieldFormSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: current, error: loadError } = await supabase
    .from("collection_fields")
    .select("type")
    .eq("id", fieldId)
    .maybeSingle();
  if (loadError) return dbFail("Saving the field", loadError);
  if (!current) return fail("Field not found.");
  if (current.type !== v.type) return fail("A field's type cannot be changed. Delete it and add a new one.");

  const { error } = await supabase
    .from("collection_fields")
    .update({ label: v.label, options: toFieldOptions(v), required: v.required, show_in_card: v.show_in_card })
    .eq("id", fieldId);
  if (error) return dbFail("Saving the field", error);

  revalidatePath("/collections", "layout");
  return ok(undefined);
}

const reorderSchema = z.object({
  collectionId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1).max(MAX_FIELDS),
});

export async function reorderFields(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.orderedIds.map((id, i) =>
      supabase.from("collection_fields").update({ sort_order: i }).eq("id", id).eq("collection_id", parsed.data.collectionId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbFail("Reordering fields", failed.error);

  revalidatePath("/collections", "layout");
  return ok(undefined);
}

/** Removes the definition and strips its key from every entry in the collection. */
export async function deleteField(fieldId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: field, error: loadError } = await supabase
    .from("collection_fields")
    .select("collection_id, key")
    .eq("id", fieldId)
    .maybeSingle();
  if (loadError) return dbFail("Deleting the field", loadError);
  if (!field) return fail("Field not found.");

  const { error } = await supabase.from("collection_fields").delete().eq("id", fieldId);
  if (error) return dbFail("Deleting the field", error);

  const { error: rpcError } = await supabase.rpc("remove_entry_attribute", {
    p_collection_id: field.collection_id,
    p_key: field.key,
  });
  if (rpcError) return dbFail("Cleaning up entry values", rpcError);

  revalidatePath("/collections", "layout");
  return ok(undefined);
}
