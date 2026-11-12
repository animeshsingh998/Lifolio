"use server";

import { fail, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, removeImages, signImageUrl, uploadImage } from "@/lib/images/storage";
import { createClient } from "@/lib/supabase/server";

/**
 * Uploads a file chosen in the entry form. Happens before the entry is saved, so
 * the path is held in form state; the save then records it on the entry.
 */
export async function uploadEntryImage(formData: FormData): Promise<ActionResult<{ path: string; url: string }>> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Choose an image file.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail("Use a JPEG, PNG, WebP, GIF or AVIF image.");
  if (file.size === 0) return fail("That file is empty.");
  if (file.size > MAX_IMAGE_BYTES) return fail("Images must be 8 MB or smaller.");

  const supabase = await createClient();
  try {
    const path = await uploadImage(supabase, user.id, file, file.type);
    const url = await signImageUrl(supabase, path);
    return ok({ path, url: url ?? "" });
  } catch (error) {
    console.error("[lifolio] upload image:", error);
    if (error instanceof Error && error.message.startsWith("That file")) return fail(error.message);
    return fail("Upload failed. Please try again.");
  }
}

/** Lets the form discard an upload the user changed their mind about before saving. */
export async function discardUploadedImage(path: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!path.startsWith(`${user.id}/`)) return fail("Not your image.");
  const supabase = await createClient();
  await removeImages(supabase, [path]);
  return ok(undefined);
}
