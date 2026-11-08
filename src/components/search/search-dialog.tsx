"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Pencil, Search } from "lucide-react";
import { quickSearch, type QuickHit } from "@/actions/search";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { StatusBadge } from "@/components/entries/status-badge";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { CollectionSummary } from "@/types/domain";

type SearchDialogApi = { open: () => void };
const SearchDialogContext = createContext<SearchDialogApi | null>(null);

export function useSearchDialog(): SearchDialogApi {
  const ctx = useContext(SearchDialogContext);
  if (!ctx) throw new Error("useSearchDialog must be used inside SearchDialogProvider");
  return ctx;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

/** Mounts the ⌘K / Ctrl+K palette once for the whole app and exposes `open()` to triggers. */
export function SearchDialogProvider({ collections, children }: { collections: CollectionSummary[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const api = useMemo<SearchDialogApi>(() => ({ open: () => setOpen(true) }), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SearchDialogContext.Provider value={api}>
      {children}
      <SearchDialog open={open} onOpenChange={setOpen} collections={collections} />
    </SearchDialogContext.Provider>
  );
}

type SearchDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; collections: CollectionSummary[] };

function SearchDialog({ open, onOpenChange, collections }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    seq.current++;
    setQuery("");
    setHits([]);
    setLoading(false);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < MIN_QUERY) {
      seq.current++;
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const id = ++seq.current;
      const result = await quickSearch(q);
      if (id !== seq.current) return; // a newer query is in flight
      setLoading(false);
      if (result.ok) {
        setHits(result.data);
        setError(null);
      } else {
        setHits([]);
        setError(result.error);
      }
    }, DEBOUNCE_MS);
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const q = query.trim();
  const matchedCollections = (q ? collections.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : collections).slice(0, q ? 4 : 6);
  const searching = q.length >= MIN_QUERY;
  const nothing = searching && !loading && !error && hits.length === 0 && matchedCollections.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Search" description="Search your collections and entries" className="sm:max-w-xl">
      {/* The Base UI CommandDialog does not add the cmdk root itself; items need it for their store. */}
      <Command shouldFilter={false} loop>
        <CommandInput value={query} onValueChange={onQueryChange} placeholder="Search everything…" autoFocus />
        <CommandList>
          {nothing ? <CommandEmpty>No results for “{q}”.</CommandEmpty> : null}
          {error ? <p className="px-3 py-4 text-center text-sm text-destructive">{error}</p> : null}
          {!searching && !error ? (
            <p className="px-3 pt-3 pb-1 text-xs text-muted-foreground">Type at least {MIN_QUERY} characters to search entries by title, notes or tag.</p>
          ) : null}

          {matchedCollections.length > 0 ? (
            <CommandGroup heading={q ? "Collections" : "Jump to"}>
              {matchedCollections.map((c) => (
                <CommandItem key={c.id} value={`collection:${c.slug}`} onSelect={() => go(`/collections/${c.slug}`)}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <CollectionIcon name={c.icon} className="size-4" />
                  </span>
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.entry_count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {searching && (loading || hits.length > 0) ? (
            <>
              {matchedCollections.length > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={loading && hits.length === 0 ? "Searching…" : "Entries"}>
                {loading && hits.length === 0 ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : null}
                {hits.map((h) => (
                  <CommandItem key={h.id} value={`entry:${h.id}`} onSelect={() => go(`/collections/${h.collection.slug}/${h.id}`)}>
                    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {h.cover_url ? (
                        <Image src={h.cover_url} alt="" fill sizes="32px" className="object-cover" />
                      ) : (
                        <CollectionIcon name={h.collection.icon} className="size-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{h.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{h.collection.name}</span>
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      <StatusBadge options={h.collection.status_options} status={h.status} className="hidden sm:inline-flex" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Edit ${h.title}`}
                        title="Edit"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          go(`/collections/${h.collection.slug}/${h.id}/edit`);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil />
                      </Button>
                    </span>
                  </CommandItem>
                ))}
                {!loading ? (
                  <CommandItem value="all-results" onSelect={() => go(`/search?q=${encodeURIComponent(q)}`)} className="text-muted-foreground">
                    <ArrowRight />
                    See all results for “{q}”
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** Sidebar entry that opens the palette. */
export function SidebarSearchButton() {
  const { open } = useSearchDialog();
  return (
    <SidebarMenuButton tooltip="Search (Ctrl K)" onClick={open}>
      <Search />
      <span>Search</span>
      <kbd className="pointer-events-none ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden sm:inline-block">
        Ctrl K
      </kbd>
    </SidebarMenuButton>
  );
}

/** Icon button for the mobile header. */
export function SearchIconButton({ className }: { className?: string }) {
  const { open } = useSearchDialog();
  return (
    <Button variant="ghost" size="icon" aria-label="Search" onClick={open} className={cn("size-8", className)}>
      <Search />
    </Button>
  );
}
