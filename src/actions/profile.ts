"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbFail, fail, fromZod, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const nameSchema = z.string().trim().min(1, "Enter a name.").max(60, "Keep it under 60 characters.");

export async function updateDisplayName(input: unknown): Promise<ActionResult<{ display_name: string }>> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  // Upsert so an account whose profile row is missing (trigger added later) still works.
  const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: parsed.data }, { onConflict: "id" });
  if (error) return dbFail("Saving your name", error);
  revalidatePath("/", "layout");
  return ok({ display_name: parsed.data });
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Keep it under 72 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords do not match.", path: ["confirm"] });

export async function changePassword(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[lifolio] change password:", error.message);
    // Supabase asks for a recent login for sensitive changes.
    if (/reauthenticat|recent/i.test(error.message)) return fail("Please log out and back in, then try again.");
    if (/same password/i.test(error.message)) return fail("That is already your password.");
    return fail("Could not change the password. Try again.");
  }
  return ok(undefined);
}
