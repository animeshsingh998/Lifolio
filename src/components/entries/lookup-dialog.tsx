"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2, Search } from "lucide-react";
import { lookupDetails, searchLookup } from "@/actions/lookup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { LookupProviderInfo, LookupResult } from "@/lib/lookup/types";
import { cn } from "@/lib/utils";

type LookupDialogProps = {
  provider: LookupProviderInfo;
  initialQuery: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (result: LookupResult) => void;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "results"; query: string; results: LookupResult[] };

/** Debounced provider search; picking a row fetches details (if any) and hands the result back. */
export function LookupDialog({ provider, initialQuery, open, onOpenChange, onPick }: LookupDialogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [picking, setPicking] = useState<string | null>(null);
  const requestId = useRef(0);

  // Seed the box with the title each time the dialog opens.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => setQuery(initialQuery), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      const id = window.setTimeout(() => setState({ kind: "idle" }), 0);
      return () => window.clearTimeout(id);
    }
    const current = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setState({ kind: "loading" });
      const result = await searchLookup(provider.id, q);
      if (current !== requestId.current) return; // a newer query superseded this one
      setState(result.ok ? { kind: "results", query: q, results: result.data } : { kind: "error", message: result.error });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query, open, provider.id]);

  async function pick(result: LookupResult) {
    setPicking(result.externalId);
    const details = await lookupDetails(provider.id, result.externalId);
    setPicking(null);
    onPick(details.ok && details.data ? details.data : result);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (picking ? undefined : onOpenChange(next))}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search {provider.label}</DialogTitle>
          <DialogDescription>Pick a match to fill the title, cover and details. You can still edit everything before saving.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a title…"
            className="pl-8"
            aria-label="Search"
          />
        </div>

        <div className="-mx-1 min-h-40 flex-1 overflow-y-auto px-1" aria-live="polite" aria-busy={state.kind === "loading"}>
          {state.kind === "idle" ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Type at least two characters.</p>
          ) : state.kind === "loading" ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </p>
          ) : state.kind === "error" ? (
            <p className="py-10 text-center text-sm text-destructive">{state.message}</p>
          ) : state.results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No results for “{state.query}”.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {state.results.map((r) => (
                <li key={r.externalId}>
                  <button
                    type="button"
                    disabled={picking !== null}
                    onClick={() => pick(r)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60",
                      picking === r.externalId && "bg-muted",
                    )}
                  >
                    <span className="flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {r.thumbnailUrl ? (
                        // Thumbnails come from the provider's CDN and are not stored; plain <img> avoids host allow-listing.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumbnailUrl} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <ImageOff className="size-4 text-muted-foreground/60" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      {r.subtitle ? <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span> : null}
                    </span>
                    {picking === r.externalId ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">{provider.attribution}</p>
      </DialogContent>
    </Dialog>
  );
}
