"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Loader2, X } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { timelineHref, type TimelineFilters } from "@/lib/timeline/params";
import type { CollectionSummary } from "@/types/domain";

type TimelineFiltersBarProps = { collections: CollectionSummary[]; years: number[]; filters: TimelineFilters };

/** Collection chips (multi-select) and a year picker; every change is a URL change. */
export function TimelineFiltersBar({ collections, years, filters }: TimelineFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function apply(next: Partial<TimelineFilters>) {
    startTransition(() => router.replace(timelineHref(pathname, { ...filters, ...next, page: 1 }), { scroll: false }));
  }

  const active = filters.collections.length > 0 || filters.year !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        value={filters.collections}
        onValueChange={(v) => apply({ collections: v as string[] })}
        aria-label="Collections"
        className="flex-wrap"
      >
        {collections.map((c) => (
          <ToggleGroupItem key={c.id} value={c.slug} aria-label={c.name}>
            <CollectionIcon name={c.icon} className="size-3.5" />
            <span className="hidden sm:inline">{c.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {years.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
            {filters.year ?? "All years"}
            <ChevronDown className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-36 overflow-y-auto">
            <DropdownMenuRadioGroup value={filters.year === null ? "" : String(filters.year)} onValueChange={(v) => apply({ year: v ? Number(v) : null })}>
              <DropdownMenuRadioItem value="">All years</DropdownMenuRadioItem>
              {years.map((y) => (
                <DropdownMenuRadioItem key={y} value={String(y)}>
                  {y}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {active ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => apply({ collections: [], year: null })}>
          <X /> Clear
        </Button>
      ) : null}
      {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
