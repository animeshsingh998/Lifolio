"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, updateDisplayName } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setName(result.data.display_name);
      toast.success("Name saved");
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="display_name">Display name</FieldLabel>
        <Input id="display_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="nickname" aria-invalid={!!error} />
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <Button type="submit" disabled={isPending || name.trim() === initialName.trim() || !name.trim()} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : null} Save
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await changePassword({ password, confirm });
      if (!result.ok) {
        setErrors(result.fieldErrors && Object.keys(result.fieldErrors).length ? result.fieldErrors : { form: result.error });
        return;
      }
      setErrors({});
      setPassword("");
      setConfirm("");
      toast.success("Password changed");
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="new_password">New password</FieldLabel>
        <Input id="new_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-invalid={!!errors.password} />
        {errors.password ? <FieldError>{errors.password}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="confirm_password">Repeat it</FieldLabel>
        <Input id="confirm_password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={!!errors.confirm} />
        {errors.confirm ? <FieldError>{errors.confirm}</FieldError> : null}
      </Field>
      {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}
      <Button type="submit" variant="outline" disabled={isPending || !password || !confirm} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : null} Change password
      </Button>
    </form>
  );
}
