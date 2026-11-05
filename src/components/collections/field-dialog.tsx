"use client";

import { useEffect, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addField, updateField } from "@/actions/fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldFormSchema, type FieldFormInput, type FieldFormOutput } from "@/lib/collections/schemas";
import { availableFieldTypes, fieldDefinitions } from "@/lib/fields/definitions";
import type { CollectionField, FieldType } from "@/types/domain";

type FieldDialogProps = {
  collectionId: string;
  /** Editing an existing field (type locked) or adding a new one. */
  field: CollectionField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toFormValues(field: CollectionField | null): FieldFormInput {
  const o = field?.options ?? {};
  return {
    label: field?.label ?? "",
    type: field?.type ?? "text",
    required: field?.required ?? false,
    show_in_card: field?.show_in_card ?? false,
    choices: o.choices?.join("\n") ?? "",
    min: o.min?.toString() ?? "",
    max: o.max?.toString() ?? "",
    step: o.step?.toString() ?? "",
    unit: o.unit ?? "",
    placeholder: o.placeholder ?? "",
  };
}

export function FieldDialog({ collectionId, field, open, onOpenChange }: FieldDialogProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FieldFormInput, unknown, FieldFormOutput>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: toFormValues(field),
  });
  const type = useWatch({ control: form.control, name: "type" });
  const configurable = fieldDefinitions[type].configurable;

  // Re-seed when the dialog opens for a different field.
  useEffect(() => {
    if (open) form.reset(toFormValues(field));
  }, [open, field, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = field ? await updateField(field.id, values) : await addField(collectionId, values);
      if (!result.ok) {
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(path as keyof FieldFormInput, { message });
        }
        toast.error(result.error);
        return;
      }
      toast.success(field ? "Field saved" : "Field added");
      onOpenChange(false);
    });
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{field ? "Edit field" : "Add field"}</DialogTitle>
            <DialogDescription>
              {field ? "The type cannot be changed once created." : "Choose a type, then name the field."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!errors.type}>
              <FieldLabel htmlFor="f-type">Type</FieldLabel>
              <Controller
                control={form.control}
                name="type"
                render={({ field: ctl }) => (
                  <Select value={ctl.value} onValueChange={(v) => v && ctl.onChange(v as FieldType)} disabled={!!field}>
                    <SelectTrigger id="f-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFieldTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          <span className="flex flex-col items-start">
                            <span>{fieldDefinitions[t].label}</span>
                            <span className="text-xs text-muted-foreground">{fieldDefinitions[t].description}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.type]} />
            </Field>

            <Field data-invalid={!!errors.label}>
              <FieldLabel htmlFor="f-label">Label</FieldLabel>
              <Input id="f-label" maxLength={60} autoFocus placeholder="e.g. Director" {...form.register("label")} />
              <FieldError errors={[errors.label]} />
            </Field>

            {configurable.includes("choices") ? (
              <Field data-invalid={!!errors.choices}>
                <FieldLabel htmlFor="f-choices">Choices</FieldLabel>
                <Textarea id="f-choices" rows={4} placeholder={"One per line\nor comma-separated"} {...form.register("choices")} />
                <FieldError errors={[errors.choices]} />
              </Field>
            ) : null}

            {configurable.includes("min") ? (
              <div className="grid grid-cols-4 gap-3">
                <Field data-invalid={!!errors.min}>
                  <FieldLabel htmlFor="f-min">Min</FieldLabel>
                  <Input id="f-min" inputMode="decimal" {...form.register("min")} />
                  <FieldError errors={[errors.min]} />
                </Field>
                <Field data-invalid={!!errors.max}>
                  <FieldLabel htmlFor="f-max">Max</FieldLabel>
                  <Input id="f-max" inputMode="decimal" {...form.register("max")} />
                  <FieldError errors={[errors.max]} />
                </Field>
                <Field data-invalid={!!errors.step}>
                  <FieldLabel htmlFor="f-step">Step</FieldLabel>
                  <Input id="f-step" inputMode="decimal" placeholder="1" {...form.register("step")} />
                  <FieldError errors={[errors.step]} />
                </Field>
                <Field data-invalid={!!errors.unit}>
                  <FieldLabel htmlFor="f-unit">Unit</FieldLabel>
                  <Input id="f-unit" maxLength={12} placeholder="mm" {...form.register("unit")} />
                  <FieldError errors={[errors.unit]} />
                </Field>
              </div>
            ) : null}

            {configurable.includes("placeholder") ? (
              <Field data-invalid={!!errors.placeholder}>
                <FieldLabel htmlFor="f-placeholder">Placeholder</FieldLabel>
                <Input id="f-placeholder" maxLength={80} {...form.register("placeholder")} />
                <FieldDescription>Hint text shown in the empty input.</FieldDescription>
              </Field>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field orientation="horizontal">
                <Controller
                  control={form.control}
                  name="required"
                  render={({ field: ctl }) => <Checkbox id="f-required" checked={ctl.value} onCheckedChange={(c) => ctl.onChange(c === true)} />}
                />
                <FieldLabel htmlFor="f-required">Required</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Controller
                  control={form.control}
                  name="show_in_card"
                  render={({ field: ctl }) => <Checkbox id="f-card" checked={ctl.value} onCheckedChange={(c) => ctl.onChange(c === true)} />}
                />
                <FieldLabel htmlFor="f-card">Show on cards</FieldLabel>
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {field ? "Save" : "Add field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
