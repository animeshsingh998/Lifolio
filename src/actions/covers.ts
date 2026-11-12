"use server";

import { fail, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { COVER_CONTENT_TYPE } from "@/lib/images/process";
import { PROCESSED_FOLDER, downloadImage, removeImages, uploadImage } from "@/lib/images/storage";
import { createClient } from "@/lib/supabase/server";

const BATCH = 5; // keeps one call comfortably inside a serverless function's time budget

export type OptimiseBatchResult = { converted: number; failed: number; remaining: number };

/**
 * Re-encodes a handful of pre-existing covers to the web-sized WebP that new uploads get,
 * relinks the entry quietly (no activity, no updated_at bump) and removes the original.
 * The client calls this repeatedly until `remaining` is 0.
 */
export async function optimiseCoverBatch(): Promise<ActionResult<OptimiseBatchResult>> {
  const user = await requireUser();
  const supabase = await createClient();
  const notProcessed = `${user.id}/${PROCESSED_FOLDER}/%`;

  const { data: rows, error, count } = await supabase
    .from("entries")
    .select("id, cover_image_path", { count: "exact" })
    .not("cover_image_path", "is", null)
    .not("cover_image_path", "like", notProcessed)
    .order("created_at")
    .limit(BATCH);
  if (error) {
    console.error("[lifolio] optimise covers list:", error.message);
    return fail("Could not load covers. Please try again.");
  }

  let converted = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const from = row.cover_image_path;
    if (!from || !from.startsWith(`${user.id}/`)) {
      failed++;
      continue;
    }
    try {
      const bytes = await downloadImage(supabase, from);
      // The original's type is unknown here; sharp sniffs the bytes, the label only gates the extension map.
      const to = await uploadImage(supabase, user.id, bytes, COVER_CONTENT_TYPE);
      const { data: relinked, error: relinkError } = await supabase.rpc("relink_cover", { p_entry_id: row.id, p_from: from, p_to: to });
      if (relinkError || !relinked) {
        await removeImages(supabase, [to]);
        throw new Error(relinkError?.message ?? "entry changed meanwhile");
      }
      // Another entry may share the same original (duplicated imports); remove it only once nothing points at it.
      const { count: stillUsed } = await supabase.from("entries").select("id", { count: "exact", head: true }).eq("cover_image_path", from);
      if (!stillUsed) await removeImages(supabase, [from]);
      converted++;
    } catch (err) {
      console.error("[lifolio] optimise cover", from, err);
      failed++;
    }
  }

  const total = count ?? 0;
  return ok({ converted, failed, remaining: Math.max(0, total - converted - failed) });
}
