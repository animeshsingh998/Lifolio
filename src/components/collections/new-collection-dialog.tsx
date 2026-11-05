"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, SquareDashed } from "lucide-react";
import { toast } from "sonner";
import { createCollection } from "@/actions/collections";
import { CollectionIcon } from "./collection-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { templates } from "@/lib/collections/templates";
import { cn } from "@/lib/utils";

const OPTIONS = [
  ...templates.map((t) => ({ id: t.id, name: t.name, description: t.description, icon: t.icon })),
  { id: "blank", name: "Blank", description: "Start from scratch and add your own fields.", icon: null },
];

export function NewCollectionDialog({ trigger }: { trigger?: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState("movies");
  const [name, setName] = useState("Movies");
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    setTemplate(id);
    if (!nameTouched) setName(id === "blank" ? "" : (OPTIONS.find((o) => o.id === id)?.name ?? ""));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCollection({ name, template });
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.error);
        return;
      }
      toast.success(`Created ${name.trim()}`);
      setOpen(false);
      router.push(template === "blank" ? `/collections/${result.data.slug}/settings` : `/collections/${result.data.slug}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setTemplate("movies");
          setName("Movies");
          setNameTouched(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus />
              New collection
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>Start from a template or build your own. Fields can be changed later.</DialogDescription>
          </DialogHeader>

          <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={template === o.id}
                onClick={() => pick(o.id)}
                disabled={pending}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  template === o.id && "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-muted">
                  {o.icon ? <CollectionIcon name={o.icon} /> : <SquareDashed className="size-4" />}
                </span>
                <span className="text-sm font-medium">{o.name}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{o.description}</span>
              </button>
            ))}
          </div>

          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="new-collection-name">Name</FieldLabel>
            <Input
              id="new-collection-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              placeholder={template === "blank" ? "e.g. Fragrances" : undefined}
              maxLength={60}
              autoFocus={template === "blank"}
              disabled={pending}
              aria-invalid={!!error}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
