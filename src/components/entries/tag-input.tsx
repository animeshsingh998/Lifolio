"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MAX_TAG_LENGTH, MAX_TAGS } from "@/lib/fields/schema";
import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/** Chips + text input. Enter or comma adds, Backspace on an empty input removes the last tag. */
export function TagInput({ value, onChange, id, disabled, invalid }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const next = draft
      .split(",")
      .map((t) => t.trim().toLowerCase().slice(0, MAX_TAG_LENGTH))
      .filter((t) => t && !value.includes(t));
    if (next.length) onChange([...value, ...next].slice(0, MAX_TAGS));
    setDraft("");
  }

  return (
    <div
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive ring-3 ring-destructive/20",
        disabled && "opacity-50",
      )}
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((t) => t !== tag));
            }}
            className="rounded-sm p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled || value.length >= MAX_TAGS}
        placeholder={value.length ? "" : "Add a tag and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        className="min-w-24 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
