"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ALLOW_SIGNUP, getSiteUrl } from "@/lib/site";

export type AuthState = {
  error?: string;
  success?: string;
};

const emailSchema = z.email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

/** Origin for links in auth emails: the request origin in dev, the configured site URL otherwise. */
async function emailRedirectOrigin() {
  const origin = (await headers()).get("origin");
  return origin ?? getSiteUrl();
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Incorrect email or password." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!ALLOW_SIGNUP) return { error: "Sign-up is currently disabled." };

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await emailRedirectOrigin()}/auth/confirm?next=/dashboard` },
  });
  if (error) return { error: error.message };

  // Email confirmation enabled (Supabase default): no session yet.
  if (!data.session) {
    return { success: "Check your inbox and click the confirmation link to finish signing up." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function forgotPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await emailRedirectOrigin()}/auth/confirm?next=/reset-password`,
  });

  // Same message whether or not the account exists, so emails cannot be enumerated.
  return { success: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
