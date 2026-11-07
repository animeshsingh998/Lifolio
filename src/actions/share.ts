"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { hashShareToken, newShareToken, SHARE_DURATIONS } from "@/lib/share/token";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const hoursSchema = z.union(SHARE_DURATIONS.map((d) => z.literal(d.hours)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>]);

export type CreatedShareLink = { id: string; url: string; expires_at: string };

/** Mints a link for a collection the caller owns. The raw token is returned once and never stored. */
export async function createShareLink(collectionId: string, input: unknown): Promise<ActionResult<CreatedShareLink>> {
  const user = await requireUser();
  const hours = hoursSchema.safeParse(input);
  if (!hours.success) return fromZod(hours.error);

  const supabase = await createClient();
  const { data: collection } = await supabase.from("collections").select("id, slug").eq("id", collectionId).maybeSingle();
  if (!collection) return fail("Collection not found.");

  const token = newShareToken();
  const expiresAt = new Date(Date.now() + hours.data * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("collection_shares")
    .insert({ collection_id: collectionId, user_id: user.id, token_hash: hashShareToken(token), expires_at: expiresAt })
    .select("id")
    .single();
  if (error) return dbFail("Creating the link", error);

  revalidatePath(`/collections/${collection.slug}`);
  return ok({ id: data.id, url: `${getSiteUrl()}/s/${token}`, expires_at: expiresAt });
}

export async function revokeShareLink(shareId: string): Promise<ActionResult> {
  await requireUser();
  const parsed = z.uuid().safeParse(shareId);
  if (!parsed.success) return fail("Invalid link.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("revoked_at", null)
    .select("collection_id, collections(slug)")
    .maybeSingle();
  if (error) return dbFail("Revoking the link", error);
  if (!data) return fail("Link not found.");
  revalidatePath("/", "layout");
  return ok(undefined);
}
