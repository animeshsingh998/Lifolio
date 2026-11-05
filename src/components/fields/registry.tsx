"use client";

/**
 * UI half of the field type registry: one Input and one Display per type.
 * Inputs are controlled (value / onChange) so react-hook-form's Controller can drive them.
 */
import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldDefinitions } from "@/lib/fields/definitions";
import type { CollectionField, FieldType } from "@/types/domain";

export type FieldInputProps = {
  field: CollectionField;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  id: string;
  invalid?: boolean;
  disabled?: boolean;
};

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

const inputs: Record<FieldType, (p: FieldInputProps) => React.ReactNode> = {
  text: ({ field, value, onChange, onBlur, id, invalid, disabled }) => (
    <Input
      id={id}
      value={str(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={field.options.placeholder}
      aria-invalid={invalid}
      disabled={disabled}
      maxLength={500}
    />
  ),
  textarea: ({ field, value, onChange, onBlur, id, invalid, disabled }) => (
    <Textarea
      id={id}
      value={str(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={field.options.placeholder}
      aria-invalid={invalid}
      disabled={disabled}
      rows={4}
      maxLength={5000}
    />
  ),
  number: ({ field, value, onChange, onBlur, id, invalid, disabled }) => (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={str(value)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        min={field.options.min}
        max={field.options.max}
        step={field.options.step ?? "any"}
        aria-invalid={invalid}
        disabled={disabled}
        className="max-w-40"
      />
      {field.options.unit ? <span className="text-sm text-muted-foreground">{field.options.unit}</span> : null}
    </div>
  ),
  date: ({ value, onChange, onBlur, id, invalid, disabled }) => (
    <Input
      id={id}
      type="date"
      value={str(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid}
      disabled={disabled}
      className="max-w-48"
    />
  ),
  select: ({ field, value, onChange, id, invalid, disabled }) => {
    const choices = field.options.choices ?? [];
    const current = str(value);
    return (
      <Select value={current || null} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={invalid} className="w-full max-w-72">
          <SelectValue placeholder={`Choose ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
  url: ({ field, value, onChange, onBlur, id, invalid, disabled }) => (
    <Input
      id={id}
      type="url"
      inputMode="url"
      value={str(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={field.options.placeholder ?? "https://"}
      aria-invalid={invalid}
      disabled={disabled}
    />
  ),
  checkbox: ({ value, onChange, id, invalid, disabled }) => (
    <Checkbox id={id} checked={value === true} onCheckedChange={(c) => onChange(c === true)} aria-invalid={invalid} disabled={disabled} />
  ),
  image: ({ id }) => (
    <p id={id} className="text-sm text-muted-foreground">
      Image fields arrive in Phase 3.
    </p>
  ),
};

export function FieldInput(props: FieldInputProps) {
  return <>{inputs[props.field.type](props)}</>;
}

/** Read-only rendering for detail pages, cards and rows. Returns null for empty values. */
export function FieldDisplay({ field, value }: { field: CollectionField; value: unknown }) {
  const text = fieldDefinitions[field.type].format(value, field.options);
  if (!text) return null;

  if (field.type === "url" && typeof value === "string") {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
      >
        <span className="truncate">{text}</span>
        <ExternalLink className="size-3.5 shrink-0" />
      </a>
    );
  }
  if (field.type === "textarea") return <p className="whitespace-pre-wrap">{text}</p>;
  return <span>{text}</span>;
}
