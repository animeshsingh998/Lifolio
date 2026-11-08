import Image from "next/image";
import Link from "next/link";
import { CalendarOff, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { Stars } from "@/components/entries/star-rating";
import { StatusBadge } from "@/components/entries/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { TimelineFiltersBar } from "@/components/timeline/timeline-filters";
import { Button } from "@/components/ui/button";
import type { SearchParamsInput } from "@/lib/entries/filters";
import { listCollections } from "@/lib/queries/collections";
import { listTimeline } from "@/lib/queries/timeline";
import { monthLabel, parseTimelineFilters, TIMELINE_PAGE_SIZE, timelineHref } from "@/lib/timeline/params";
import type { Entry } from "@/types/domain";

export const metadata = { title: "Timeline" };

type Props = { searchParams: Promise<SearchParamsInput> };

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function TimelinePage({ searchParams }: Props) {
  const [sp, collections] = await Promise.all([searchParams, listCollections()]);
  const filters = parseTimelineFilters(sp, collections.map((c) => c.slug));
  const data = await listTimeline(filters, collections);
  const byId = new Map(collections.map((c) => [c.id, c]));

  // Group this page's entries by month, keeping the newest-first order.
  const months: { key: string; entries: Entry[] }[] = [];
  for (const e of data.entries) {
    const key = e.occurred_on!.slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else months.push({ key, entries: [e] });
  }

  const pages = Math.max(1, Math.ceil(data.total / TIMELINE_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const filtered = filters.collections.length > 0 || filters.year !== null;

  return (
    <>
      <PageHeader title="Timeline" description="What you watched, read, bought and finished, in order." />

      {collections.length > 0 ? <TimelineFiltersBar collections={collections} years={data.years} filters={filters} /> : null}

      {data.total === 0 ? (
        <EmptyState
          icon={filtered ? Clock : CalendarOff}
          title={filtered ? "Nothing in this range" : "No dated entries yet"}
          description={
            filtered
              ? "Try another year or collection."
              : "Entries appear here once they have a date, such as the day you watched a film or bought a watch."
          }
          action={
            filtered ? (
              <Button variant="outline" nativeButton={false} render={<Link href="/timeline" />}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <p className="text-sm text-muted-foreground">
            {data.total.toLocaleString()} dated {data.total === 1 ? "entry" : "entries"}
            {data.undated > 0 && !filtered ? ` · ${data.undated.toLocaleString()} without a date are not shown` : ""}
          </p>

          {months.map((m) => (
            <section key={m.key} className="flex flex-col gap-3">
              <h2 className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-1.5 font-heading text-base font-semibold backdrop-blur-sm md:-mx-8 md:px-8">
                {monthLabel(`${m.key}-01`)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{m.entries.length}</span>
              </h2>
              <ol className="relative ml-3 flex flex-col gap-1 border-l pl-5">
                {m.entries.map((e) => {
                  const c = byId.get(e.collection_id);
                  if (!c) return null;
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute top-5 -left-[1.4rem] size-2 rounded-full border-2 border-background bg-primary" aria-hidden />
                      <Link
                        href={`/collections/${c.slug}/${e.id}`}
                        className="grid grid-cols-[3.25rem_2.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50 sm:grid-cols-[3.25rem_2.5rem_minmax(0,1fr)_auto_auto]"
                      >
                        <span className="text-xs tabular-nums text-muted-foreground">{dayLabel(e.occurred_on!)}</span>
                        <span className="relative flex aspect-[3/4] w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {e.cover_url ? (
                            <Image src={e.cover_url} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            <CollectionIcon name={c.icon} className="size-4 text-muted-foreground/60" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{e.title}</span>
                          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <CollectionIcon name={c.icon} className="size-3" /> {c.name}
                          </span>
                        </span>
                        <span className="hidden sm:block">{e.rating !== null && c.show_rating ? <Stars value={e.rating} starClassName="size-3.5" /> : null}</span>
                        <span className="hidden sm:block">
                          <StatusBadge options={c.status_options} status={e.status} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}

          {pages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button variant="outline" size="sm" disabled={page <= 1} nativeButton={false} render={<Link href={timelineHref("/timeline", { ...filters, page: page - 1 })} />}>
                <ChevronLeft /> Newer
              </Button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} nativeButton={false} render={<Link href={timelineHref("/timeline", { ...filters, page: page + 1 })} />}>
                Older <ChevronRight />
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
