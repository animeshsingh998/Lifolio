"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthState } from "@/actions/auth";

export type AuthFieldSpec = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  /** Optional element rendered to the right of the label (e.g. "Forgot password?"). */
  labelAside?: React.ReactNode;
};

type AuthFormProps = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  fields: AuthFieldSpec[];
  submitLabel: string;
};

/** Generic email/password form bound to a Server Action with inline error/success messages. */
export function AuthForm({ action, fields, submitLabel }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        {fields.map((f) => (
          <Field key={f.name}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
              {f.labelAside}
            </div>
            <Input
              id={f.name}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              required
              disabled={isPending}
            />
          </Field>
        ))}
      </FieldGroup>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
