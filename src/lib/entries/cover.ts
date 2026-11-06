import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntryFormOutput } from "@/lib/fields/schema";
import { storeImageFromUrl } from "@/lib/images/storage";
import type { Database } from "@/types/database";

export type CoverColumns = {
  cover_image_path: string | null;
  image_source: "upload" | "url" | "provider" | null;
  external_provider: string | null;
  external_id: string | null;
};

export const noCover: CoverColumns = { cover_image_path: null, image_source: null, external_provider: null, external_id: null };

/**
 * Turns the form's cover state into the columns to store. Downloads a remote
 * image into the bucket when `source_url` is set. Returns an error message on failure.
 */
export async function resolveCover(
  supabase: SupabaseClient<Database>,
  userId: string,
  cover: EntryFormOutput["cover"],
): Promise<{ error: string } | { columns: CoverColumns }> {
  let path = cover.path;
  let source = cover.image_source;

  if (path && !path.startsWith(`${userId}/`)) return { error: "That image does not belong to you." };

  if (cover.source_url) {
    try {
      path = await storeImageFromUrl(supabase, userId, cover.source_url);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not download the image." };
    }
    source = cover.image_source === "provider" ? "provider" : "url";
  }

  if (!path) return { columns: noCover };
  return {
    columns: {
      cover_image_path: path,
      image_source: source ?? "upload",
      external_provider: cover.external_provider,
      external_id: cover.external_provider ? cover.external_id : null,
    },
  };
}

/** Promoted columns from a validated entry payload. */
export function entryColumns(v: EntryFormOutput) {
  return {
    title: v.title,
    status: v.status,
    rating: v.rating,
    occurred_on: v.occurred_on,
    notes: v.notes || null,
    tags: v.tags,
    is_favorite: v.is_favorite,
    attributes: v.attributes as Database["public"]["Tables"]["entries"]["Insert"]["attributes"],
  };
}
