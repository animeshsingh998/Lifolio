"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, Heart, Loader2, Search, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filtersHref,
  MIN_RATING_CHOICES,
  sortOptions,
  type EntryFilters,
  type SortValue,
} from "@/lib/entries/filters";
import type { TagCount } from "@/lib/queries/entries";
import { cn } from "@/lib/utils";
import type { Collection, CollectionField } from "@/types/domain";

type EntryFiltersBarProps = {
  collection: Collection;
  fields: CollectionField[];
  tags: TagCount[];
  filters: EntryFilters;
  /** Called with the pending state so the list can dim while the URL navigation resolves. */
  onPendingChange?: (pending: boolean) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

/** Filter / sort toolbar. Every change becomes a URL change; the server re-queries. */
export function EntryFiltersBar({ collection, fields, tags, filters, onPendingChange }: EntryFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local text so typing is instant; it follows the URL when the server value changes (back button, Activity).
  const [q, setQ] = useState(filters.q);
  const [seenQ, setSeenQ] = useState(filters.q);
  if (seenQ !== filters.q) {
    setSeenQ(filters.q);
    setQ(filters.q);
  }

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  function apply(next: Partial<EntryFilters>) {
    const merged: EntryFilters = { ...filters, ...next, page: 1 };
    startTransition(() => router.replace(filtersHref(pathname, merged), { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  const selectFields = fields.filter((f) => f.type === "select" && (f.options.choices?.length ?? 0) > 0);
  const sorts = sortOptions(collection);
  const active = activeFilterCount(filters);
  const noun = collection.item_noun;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          {isPending ? <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
          <Input
            type="search"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${noun}s…`}
            aria-label={`Search ${noun}s`}
            className="pl-8"
          />
        </div>

        {collection.status_options.length > 0 ? (
          <FilterMenu label="Status" count={filters.statuses.length}>
            <DropdownMenuGroup>
              {collection.status_options.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.key}
                  checked={filters.statuses.includes(s.key)}
                  onCheckedChange={(checked) =>
                    apply({ statuses: checked ? [...filters.statuses, s.key] : filters.statuses.filter((k) => k !== s.key) })
                  }
                >
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </FilterMenu>
        ) : null}

        {collection.show_rating ? (
          <FilterMenu label="Rating" count={filters.minRating !== null ? 1 : 0} activeLabel={MIN_RATING_CHOICES.find((c) => c.value === filters.minRating)?.label}>
            <DropdownMenuRadioGroup
              value={filters.minRating === null ? "any" : String(filters.minRating)}
              onValueChange={(v) => apply({ minRating: v === "any" ? null : Number(v) })}
            >
              <DropdownMenuRadioItem value="any">Any rating</DropdownMenuRadioItem>
              {MIN_RATING_CHOICES.map((c) => (
                <DropdownMenuRadioItem key={c.value} value={String(c.value)}>
                  {c.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </FilterMenu>
        ) : null}

        {selectFields.map((f) => (
          <FilterMenu key={f.key} label={f.label} count={filters.attrs[f.key] ? 1 : 0} activeLabel={filters.attrs[f.key]}>
            <DropdownMenuRadioGroup
              value={filters.attrs[f.key] ?? ""}
              onValueChange={(v) => {
                const attrs = { ...filters.attrs };
                if (v) attrs[f.key] = v;
                else delete attrs[f.key];
                apply({ attrs });
              }}
            >
              <DropdownMenuRadioItem value="">Any</DropdownMenuRadioItem>
              {(f.options.choices ?? []).map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>
                  {c}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </FilterMenu>
        ))}

        {tags.length > 0 ? (
          <FilterMenu label="Tags" icon={Tag} count={filters.tags.length}>
            <DropdownMenuGroup className="max-h-72 overflow-y-auto">
              {tags.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t.tag}
                  checked={filters.tags.includes(t.tag)}
                  onCheckedChange={(checked) =>
                    apply({ tags: checked ? [...filters.tags, t.tag] : filters.tags.filter((x) => x !== t.tag) })
                  }
                >
                  <span className="truncate">{t.tag}</span>
                  <span className="ml-auto pl-3 text-xs text-muted-foreground">{t.count}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </FilterMenu>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={filters.favorite}
          onClick={() => apply({ favorite: !filters.favorite })}
          className={cn(filters.favorite && "border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-300")}
        >
          <Heart className={cn(filters.favorite && "fill-current")} /> Favourites
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {active > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => apply({ ...EMPTY_FILTERS, sort: filters.sort })}>
              <X /> Clear
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <ArrowUpDown />
              <span className="hidden sm:inline">{sorts.find((s) => s.value === filters.sort)?.label ?? "Sort"}</span>
              <ChevronDown className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filters.sort} onValueChange={(v) => apply({ sort: v as SortValue })}>
                {sorts.map((s) => (
                  <DropdownMenuRadioItem key={s.value} value={s.value}>
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

type FilterMenuProps = {
  label: string;
  count: number;
  /** Shown instead of the count for single-choice filters. */
  activeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
};

function FilterMenu({ label, count, activeLabel, icon: Icon, children }: FilterMenuProps) {
  const isActive = count > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className={cn(isActive && "border-primary/40 bg-primary/5")} />}>
        {Icon ? <Icon className="size-4" /> : null}
        {label}
        {isActive ? (
          activeLabel ? (
            <span className="max-w-28 truncate text-muted-foreground">· {activeLabel}</span>
          ) : (
            <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">{count}</Badge>
          )
        ) : null}
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

