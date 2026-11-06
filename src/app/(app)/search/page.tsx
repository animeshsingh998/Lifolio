import Link from "next/link";
import { ArrowRight, Search, SearchX } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { EntryCard } from "@/components/entries/entry-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCollectionFields } from "@/lib/queries/collections";
import { SEARCH_PAGE_LIMIT, searchEntries } from "@/lib/queries/search";
import type { CollectionSummary, Entry } from "@/types/domain";

export const metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, 100);
  const hits = q ? await searchEntries(q, SEARCH_PAGE_LIMIT) : [];

  // Group by collection, keeping the most recently updated collection first.
  const groups = new Map<string, { collection: CollectionSummary; entries: Entry[] }>();
  for (const { entry, collection } of hits) {
    const g = groups.get(collection.id) ?? { collection, entries: [] };
    g.entries.push(entry);
    groups.set(collection.id, g);
  }
  const fieldsList = await Promise.all([...groups.values()].map((g) => getCollectionFields(g.collection.id)));

  return (
    <>
      <PageHeader title="Search" description="Find anything across all your collections." />
      <form action="/search" method="get" className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" name="q" defaultValue={q} placeholder="Title, notes or tag…" aria-label="Search" className="pl-8" autoFocus={!q} />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {!q ? (
        <p className="text-sm text-muted-foreground">
          Tip: press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd> anywhere to search without leaving the page.
        </p>
      ) : hits.length === 0 ? (
        <EmptyState icon={SearchX} title={`No results for “${q}”`} description="Search looks at titles, notes and tags. Try a shorter word." />
      ) : (
        <div className="flex flex-col gap-8">
          <p className="text-sm text-muted-foreground">
            {hits.length === SEARCH_PAGE_LIMIT ? `First ${SEARCH_PAGE_LIMIT} results` : `${hits.length} ${hits.length === 1 ? "result" : "results"}`} for “{q}”
          </p>
          {[...groups.values()].map((g, i) => (
            <section key={g.collection.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <CollectionIcon name={g.collection.icon} className="size-5 text-muted-foreground" />
                  {g.collection.name}
                  <span className="text-sm font-normal text-muted-foreground">{g.entries.length}</span>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/collections/${g.collection.slug}?q=${encodeURIComponent(q)}`} />}
                >
                  Open in collection <ArrowRight />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {g.entries.map((e) => (
                  <EntryCard key={e.id} collection={g.collection} fields={fieldsList[i]} entry={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
