"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { createEntry, updateEntry } from "@/actions/entries";
import { CoverPicker } from "./cover-picker";
import { LookupDialog } from "./lookup-dialog";
import { StarRatingInput } from "./star-rating";
import { TagInput } from "./tag-input";
import { FieldInput } from "@/components/fields/registry";
import { coerceForField } from "@/lib/fields/coerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buildEntrySchema, emptyCover, entryDefaults, type EntryFormInput, type EntryFormOutput } from "@/lib/fields/schema";
import type { LookupProviderInfo, LookupResult } from "@/lib/lookup/types";
import type { Collection, CollectionField, Entry } from "@/types/domain";

type EntryFormProps = {
  collection: Collection;
  fields: CollectionField[];
  /** Present when editing. */
  entry?: Entry;
  lookup: LookupProviderInfo | null;
};

export function EntryForm({ collection, fields, entry, lookup }: EntryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lookupOpen, setLookupOpen] = useState(false);
  const schema = useMemo(() => buildEntrySchema(collection, fields), [collection, fields]);

  const form = useForm<EntryFormInput, unknown, EntryFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: entryDefaults(fields, entry),
  });
  const errors = form.formState.errors;
  const title = useWatch({ control: form.control, name: "title" });

  // Cache Components keeps recently visited pages mounted (React Activity), so this
  // form would otherwise reappear with its last values. Effects re-run each time the
  // page is shown again, so re-seed from the server's data on every reveal.
  useEffect(() => {
    form.reset(entryDefaults(fields, entry));
  }, [form, fields, entry]);
  const backHref = entry ? `/collections/${collection.slug}/${entry.id}` : `/collections/${collection.slug}`;

  function applyLookup(result: LookupResult) {
    if (!lookup) return;
    form.setValue("title", result.title, { shouldDirty: true });
    form.setValue(
      "cover",
      {
        ...emptyCover,
        source_url: result.imageUrl,
        image_source: result.imageUrl ? "provider" : null,
        external_provider: lookup.id,
        external_id: result.externalId,
      },
      { shouldDirty: true },
    );
    let filled = 0;
    for (const f of fields) {
      if (!f.lookup_key || !(f.lookup_key in result.values)) continue;
      const v = coerceForField(f, result.values[f.lookup_key]);
      if (v === null) continue;
      form.setValue(`attributes.${f.key}` as Path<EntryFormInput>, v, { shouldDirty: true });
      filled++;
    }
    toast.success(`Filled from ${lookup.label}${filled ? ` (${filled} ${filled === 1 ? "field" : "fields"})` : ""}`);
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = entry
        ? await updateEntry(collection.id, entry.id, values)
        : await createEntry(collection.id, values);
      if (!result.ok) {
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(path as Path<EntryFormInput>, { message });
        }
        toast.error(result.error);
        return;
      }
      toast.success(entry ? "Saved" : `Added to ${collection.name}`);
      // Start the next visit of this (preserved) page from a clean form.
      if (!entry) form.reset(entryDefaults(fields));
      router.push(entry ? backHref : `/collections/${collection.slug}/${result.data!.id}`);
    });
  });

  const coverError = (errors.cover as { source_url?: { message?: string }; message?: string } | undefined)?.source_url?.message;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Card>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <Controller
              control={form.control}
              name="cover"
              render={({ field }) => (
                <CoverPicker
                  value={field.value}
                  onChange={field.onChange}
                  initialPath={entry?.cover_image_path ?? null}
                  initialUrl={entry?.cover_url ?? null}
                  lookup={lookup}
                  onOpenLookup={() => setLookupOpen(true)}
                  disabled={pending}
                  error={coverError}
                />
              )}
            />

            <FieldGroup>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="e-title">Title</FieldLabel>
                <div className="flex gap-2">
                  <Input id="e-title" autoFocus={!entry} maxLength={200} aria-invalid={!!errors.title} {...form.register("title")} />
                  {lookup?.configured ? (
                    <Button type="button" variant="secondary" onClick={() => setLookupOpen(true)} disabled={pending} aria-label={`Search ${lookup.label}`}>
                      <Search /> Find
                    </Button>
                  ) : null}
                </div>
                <FieldError errors={[errors.title]} />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                {collection.status_options.length > 0 ? (
                  <Field data-invalid={!!errors.status}>
                    <FieldLabel htmlFor="e-status">Status</FieldLabel>
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value || null} onValueChange={(v) => field.onChange(v ?? "")}>
                          <SelectTrigger id="e-status" className="w-full" aria-invalid={!!errors.status}>
                            <SelectValue placeholder="No status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No status</SelectItem>
                            {collection.status_options.map((s) => (
                              <SelectItem key={s.key} value={s.key}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.status]} />
                  </Field>
                ) : null}

                {collection.date_label ? (
                  <Field data-invalid={!!errors.occurred_on}>
                    <FieldLabel htmlFor="e-date">{collection.date_label}</FieldLabel>
                    <Input id="e-date" type="date" aria-invalid={!!errors.occurred_on} {...form.register("occurred_on")} />
                    <FieldError errors={[errors.occurred_on]} />
                  </Field>
                ) : null}
              </div>

              {collection.show_rating ? (
                <Field data-invalid={!!errors.rating}>
                  <FieldLabel htmlFor="e-rating">Rating</FieldLabel>
                  <Controller
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <StarRatingInput id="e-rating" value={typeof field.value === "number" ? field.value : null} onChange={field.onChange} />
                    )}
                  />
                  <FieldError errors={[errors.rating]} />
                </Field>
              ) : null}
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {fields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {fields.map((f) => {
                const name = `attributes.${f.key}` as Path<EntryFormInput>;
                const error = errors.attributes?.[f.key as keyof typeof errors.attributes] as { message?: string } | undefined;
                const id = `e-${f.key}`;
                const horizontal = f.type === "checkbox";
                return (
                  <Field key={f.key} data-invalid={!!error} orientation={horizontal ? "horizontal" : "vertical"}>
                    {horizontal ? null : (
                      <FieldLabel htmlFor={id}>
                        {f.label}
                        {f.required ? <span className="text-muted-foreground"> *</span> : null}
                      </FieldLabel>
                    )}
                    <Controller
                      control={form.control}
                      name={name}
                      render={({ field: ctl, fieldState }) => (
                        <FieldInput
                          field={f}
                          id={id}
                          value={ctl.value}
                          onChange={ctl.onChange}
                          onBlur={ctl.onBlur}
                          invalid={fieldState.invalid}
                          disabled={pending}
                        />
                      )}
                    />
                    {horizontal ? (
                      <FieldLabel htmlFor={id}>
                        {f.label}
                        {f.required ? <span className="text-muted-foreground"> *</span> : null}
                      </FieldLabel>
                    ) : null}
                    {error?.message ? <FieldError>{error.message}</FieldError> : null}
                  </Field>
                );
              })}
            </FieldGroup>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.tags}>
              <FieldLabel htmlFor="e-tags">Tags</FieldLabel>
              <Controller
                control={form.control}
                name="tags"
                render={({ field, fieldState }) => (
                  <TagInput id="e-tags" value={field.value} onChange={field.onChange} invalid={fieldState.invalid} disabled={pending} />
                )}
              />
              <FieldError errors={[errors.tags as { message?: string } | undefined]} />
            </Field>

            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="e-notes">Notes</FieldLabel>
              <Textarea id="e-notes" rows={5} placeholder="Thoughts, a short review, where you got it…" {...form.register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>

            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name="is_favorite"
                render={({ field }) => <Switch id="e-fav" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <FieldLabel htmlFor="e-fav">Mark as favourite</FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href={backHref} />} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {entry ? "Save changes" : `Add ${collection.item_noun}`}
        </Button>
      </div>

      {lookup?.configured ? (
        <LookupDialog provider={lookup} initialQuery={title ?? ""} open={lookupOpen} onOpenChange={setLookupOpen} onPick={applyLookup} />
      ) : null}
    </form>
  );
}
