"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LayoutGrid, List, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { updateCollectionSettings } from "@/actions/collections";
import { IconPicker } from "./icon-picker";
import { SortableList } from "@/components/dnd/sortable-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COLLECTION_ICONS, DEFAULT_ICON, type CollectionIconName } from "@/lib/collections/icons";
import {
  collectionSettingsSchema,
  type CollectionSettingsInput,
  type CollectionSettingsOutput,
} from "@/lib/collections/schemas";
import { statusKey } from "@/lib/collections/slug";
import { LOOKUP_PROVIDER_CHOICES, isLookupProviderId } from "@/lib/lookup/types";
import { STATUS_KINDS, type Collection, type StatusKind } from "@/types/domain";

const KIND_LABELS: Record<StatusKind, string> = {
  planned: "Planned",
  active: "In progress",
  done: "Done",
  none: "Other",
};

export function CollectionSettingsForm({ collection }: { collection: Collection }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newStatus, setNewStatus] = useState("");

  const form = useForm<CollectionSettingsInput, unknown, CollectionSettingsOutput>({
    resolver: zodResolver(collectionSettingsSchema),
    defaultValues: {
      name: collection.name,
      description: collection.description ?? "",
      icon: (COLLECTION_ICONS as readonly string[]).includes(collection.icon)
        ? (collection.icon as CollectionIconName)
        : DEFAULT_ICON,
      item_noun: collection.item_noun,
      show_rating: collection.show_rating,
      date_enabled: collection.date_label !== null,
      date_label: collection.date_label ?? "Date",
      default_layout: collection.default_layout,
      lookup_provider: isLookupProviderId(collection.lookup_provider) ? collection.lookup_provider : "none",
      status_options: collection.status_options,
    },
  });
  const statuses = useFieldArray({ control: form.control, name: "status_options" });
  const dateEnabled = useWatch({ control: form.control, name: "date_enabled" });
  const statusError = form.formState.errors.status_options;

  function addStatus() {
    const label = newStatus.trim();
    if (!label) return;
    const existing = form.getValues("status_options");
    const base = statusKey(label);
    let key = base;
    for (let i = 2; existing.some((s) => s.key === key); i++) key = `${base}_${i}`;
    statuses.append({ key, label, kind: "none" });
    setNewStatus("");
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateCollectionSettings(collection.id, values);
      if (!result.ok) {
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(path as keyof CollectionSettingsInput, { message });
        }
        toast.error(result.error);
        return;
      }
      toast.success("Collection saved");
      form.reset(values);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>How this collection appears across Lifolio.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="c-name">Name</FieldLabel>
                <Input id="c-name" maxLength={60} aria-invalid={!!form.formState.errors.name} {...form.register("name")} />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-icon">Icon</FieldLabel>
                <Controller
                  control={form.control}
                  name="icon"
                  render={({ field }) => <IconPicker id="c-icon" value={field.value} onChange={field.onChange} disabled={pending} />}
                />
              </Field>
            </div>

            <Field data-invalid={!!form.formState.errors.description}>
              <FieldLabel htmlFor="c-description">Description</FieldLabel>
              <Textarea id="c-description" rows={2} maxLength={300} {...form.register("description")} />
              <FieldError errors={[form.formState.errors.description]} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={!!form.formState.errors.item_noun}>
                <FieldLabel htmlFor="c-noun">Item name</FieldLabel>
                <Input id="c-noun" maxLength={30} placeholder="movie, book, pair…" {...form.register("item_noun")} />
                <FieldDescription>Singular, used in buttons and counts.</FieldDescription>
                <FieldError errors={[form.formState.errors.item_noun]} />
              </Field>
              <Field>
                <FieldLabel>Default view</FieldLabel>
                <Controller
                  control={form.control}
                  name="default_layout"
                  render={({ field }) => (
                    <ToggleGroup
                      variant="outline"
                      value={[field.value]}
                      onValueChange={(v) => v[0] && field.onChange(v[0])}
                      aria-label="Default view"
                    >
                      <ToggleGroupItem value="grid" aria-label="Grid">
                        <LayoutGrid /> Grid
                      </ToggleGroupItem>
                      <ToggleGroupItem value="list" aria-label="List">
                        <List /> List
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Built-in fields</CardTitle>
          <CardDescription>Every entry has a title, notes and tags. Rating and a date are optional per collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name="show_rating"
                render={({ field }) => <Switch id="c-rating" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <FieldLabel htmlFor="c-rating">Show a star rating</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name="date_enabled"
                render={({ field }) => <Switch id="c-date" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <FieldLabel htmlFor="c-date">Track a date per entry</FieldLabel>
            </Field>
            <Field className="sm:max-w-xs">
              <FieldLabel htmlFor="c-lookup">Metadata lookup</FieldLabel>
              <Controller
                control={form.control}
                name="lookup_provider"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger id="c-lookup" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {LOOKUP_PROVIDER_CHOICES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>Search a provider when adding entries to fill the cover and bound fields.</FieldDescription>
            </Field>
            {dateEnabled ? (
              <Field data-invalid={!!form.formState.errors.date_label} className="sm:max-w-xs">
                <FieldLabel htmlFor="c-date-label">Date label</FieldLabel>
                <Input id="c-date-label" maxLength={40} placeholder="Watched on" {...form.register("date_label")} />
                <FieldDescription>Also drives the Timeline.</FieldDescription>
                <FieldError errors={[form.formState.errors.date_label]} />
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statuses</CardTitle>
          <CardDescription>
            The stages an entry can be in. The type lets the dashboard count across collections. Removing a status
            clears it from entries that use it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SortableList
            items={statuses.fields}
            getId={(s) => s.id}
            disabled={pending}
            onReorder={(_, from, to) => statuses.move(from, to)}
            renderItem={(s, index) => (
              <>
                <Input
                  aria-label="Status name"
                  maxLength={40}
                  className="flex-1"
                  {...form.register(`status_options.${index}.label` as const)}
                />
                <Controller
                  control={form.control}
                  name={`status_options.${index}.kind` as const}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <SelectTrigger aria-label="Status type" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {KIND_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove status ${s.label}`}
                  disabled={statuses.fields.length <= 1}
                  onClick={() => statuses.remove(index)}
                >
                  <X />
                </Button>
              </>
            )}
          />
          <div className="flex gap-2">
            <Input
              aria-label="New status name"
              placeholder="Add a status…"
              value={newStatus}
              maxLength={40}
              onChange={(e) => setNewStatus(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStatus();
                }
              }}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" onClick={addStatus} disabled={!newStatus.trim()}>
              <Plus /> Add
            </Button>
          </div>
          {statusError ? (
            <p className="text-sm text-destructive">
              {statusError.message ?? statusError.root?.message ?? "Check the statuses above."}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={pending || !form.formState.isDirty}>
          Reset
        </Button>
        <Button type="submit" disabled={pending || !form.formState.isDirty}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
