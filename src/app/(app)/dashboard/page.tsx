import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CollectionStatCard } from "@/components/dashboard/collection-stat-card";
import { EntryStrip } from "@/components/dashboard/entry-strip";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/queries/dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (data.collections.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="An overview of everything you track." />
        <EmptyState
          icon={Library}
          title="Nothing here yet"
          description="Stats, recent items and activity will appear once you have collections with entries."
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/collections" />}>
              Go to collections
            </Button>
          }
        />
      </>
    );
  }

  const firstWithProvider = data.collections.find((c) => c.lookup_provider) ?? data.collections[0];

  return (
    <>
      <PageHeader title="Dashboard" description="An overview of everything you track." />
      <StatTiles totals={data.totals} />

      {data.totals.entries === 0 ? (
        <EmptyState
          icon={Plus}
          title="Your collections are empty"
          description="Add a few entries by hand, or paste a JSON list to import many at once."
          action={
            <div className="flex gap-2">
              <Button nativeButton={false} render={<Link href={`/collections/${data.collections[0].slug}/new`} />}>
                <Plus /> Add {data.collections[0].item_noun}
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href={`/collections/${firstWithProvider.slug}/import`} />}>
                Import JSON
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <EntryStrip
            title="Currently tracking"
            description="Entries with an in-progress status, such as Watching or Reading."
            entries={data.tracking}
            collections={data.collections}
            fieldsByCollection={data.fieldsByCollection}
            empty="Nothing in progress right now."
          />
          <EntryStrip
            title="Recently added"
            entries={data.recent}
            collections={data.collections}
            fieldsByCollection={data.fieldsByCollection}
            empty="No entries yet."
          />
        </>
      )}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Collections</h2>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/collections" />}>
              Manage
            </Button>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {data.collections.map((c) => (
              <CollectionStatCard key={c.id} collection={c} stats={data.stats.get(c.id)} />
            ))}
          </div>
        </section>
        <ActivityFeed activity={data.activity} collections={data.collections} />
      </div>
    </>
  );
}
