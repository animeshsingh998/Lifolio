"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { setEntryRating, setEntryStatus } from "@/actions/entries";
import { StarRatingInput, Stars } from "./star-rating";
import { statusOf } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { StatusKind, StatusOption } from "@/types/domain";

/** Same palette as StatusBadge, as a clickable chip. */
const KIND_CLASSES: Record<StatusKind, string> = {
  planned: "border-transparent bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 dark:text-sky-300",
  active: "border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300",
  done: "border-transparent bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
  none: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
};

type QuickStatusProps = { entryId: string; status: string | null; options: StatusOption[]; className?: string };

/** Status chip that opens a menu to change the status in place (optimistic). */
export function QuickStatus({ entryId, status, options, className }: QuickStatusProps) {
  const [, startTransition] = useTransition();
  const [current, setOptimistic] = useOptimistic(status);
  if (options.length === 0) return null;
  const option = statusOf(options, current);

  function change(next: string | null) {
    if (next === current) return;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setEntryStatus(entryId, next);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <Badge
            variant="outline"
            className={cn("cursor-pointer gap-1 pr-1.5 select-none", KIND_CLASSES[option?.kind ?? "none"], !option && "border-dashed", className)}
          />
        }
        aria-label="Change status"
      >
        {option?.label ?? "Set status"}
        <ChevronDown className="size-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup value={current ?? ""} onValueChange={(v) => change(v || null)}>
          {options.map((s) => (
            <DropdownMenuRadioItem key={s.key} value={s.key}>
              {s.label}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="" className="text-muted-foreground">
            No status
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type QuickRatingProps = { entryId: string; rating: number | null; className?: string; starClassName?: string };

/** Compact star picker for cards and rows: hover previews, click sets, clicking the current value clears. */
export function QuickRating({ entryId, rating, className, starClassName }: QuickRatingProps) {
  const [, startTransition] = useTransition();
  const [current, setOptimistic] = useOptimistic(rating);

  function change(next: number | null) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setEntryRating(entryId, next);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <span className={cn("group/rating inline-flex", className)} title="Click to rate">
      {/* Read-only stars by default; the picker fades in on hover/focus so cards stay calm. */}
      <span className="group-focus-within/rating:hidden group-hover/rating:hidden">
        {current !== null ? <Stars value={current} starClassName={starClassName} /> : <Stars value={0} starClassName={starClassName} className="opacity-40" />}
      </span>
      <span className="hidden group-focus-within/rating:inline-flex group-hover/rating:inline-flex">
        <StarRatingInput value={current} onChange={change} compact starClassName={starClassName} />
      </span>
    </span>
  );
}

type QuickEditProps = { href: string; className?: string };

/** Pencil shortcut to the edit page. Hidden until the card is hovered (always visible on touch screens). */
export function QuickEdit({ href, className }: QuickEditProps) {
  return (
    <Button
      variant="secondary"
      size="icon-sm"
      aria-label="Edit"
      title="Edit"
      nativeButton={false}
      render={<Link href={href} />}
      className={cn(
        "rounded-full shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
        className,
      )}
    >
      <Pencil />
    </Button>
  );
}
