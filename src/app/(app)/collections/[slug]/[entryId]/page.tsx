import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { EntryActions } from "@/components/entries/entry-actions";
import { StatusBadge } from "@/components/entries/status-badge";
import { Stars } from "@/components/entries/star-rating";
import { FieldDisplay } from "@/components/fields/registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/fields/definitions";
import { formatRating } from "@/lib/rating";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";
import { getEntry } from "@/lib/queries/entries";

type Props = { params: Promise<{ slug: string; entryId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params: Props["params"]) {
  const { slug, entryId } = await params;
  if (!UUID.test(entryId)) return null;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return null;
  const [fields, entry] = await Promise.all([getCollectionFields(collection.id), getEntry(collection.id, entryId)]);
  if (!entry) return null;
  return { collection, fields, entry };
}

export async function generateMetadata({ params }: Props) {
  const data = await load(params);
  return { title: data?.entry.title ?? "Entry" };
}

export default async function EntryPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { collection, fields, entry } = data;

  const details = fields
    .map((f) => ({ field: f, value: entry.attributes[f.key] }))
    .filter(({ value }) => value !== null && value !== undefined && value !== "" && value !== false);

  const timestamp = new Date(entry.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" nativeButton={false} render={<Link href={`/collections/${collection.slug}`} />}>
          <ArrowLeft /> {collection.name}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{entry.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge options={collection.status_options} status={entry.status} />
              {entry.rating !== null && collection.show_rating ? (
                <span className="flex items-center gap-1.5">
                  <Stars value={entry.rating} />
                  <span className="tabular-nums">{formatRating(entry.rating)}</span>
                </span>
              ) : null}
              {entry.occurred_on && collection.date_label ? (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {collection.date_label} {formatDate(entry.occurred_on)}
                </span>
              ) : null}
            </div>
          </div>
          <EntryActions entryId={entry.id} title={entry.title} isFavorite={entry.is_favorite} collectionSlug={collection.slug} />
        </div>
      </div>

      <div className="grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {details.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {details.map(({ field, value }) => (
                    <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
                      <dt className="text-xs text-muted-foreground">{field.label}</dt>
                      <dd className="text-sm">
                        <FieldDisplay field={field} value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {entry.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          {details.length === 0 && !entry.notes ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No details yet. Edit this {collection.item_noun} to add some.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-muted to-muted/40">
            {entry.cover_url ? (
              <Image src={entry.cover_url} alt={`Cover of ${entry.title}`} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" priority />
            ) : (
              <CollectionIcon name={collection.icon} className="size-10 text-muted-foreground/40" />
            )}
          </div>
          {entry.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">Last updated {timestamp}</p>
        </div>
      </div>
    </>
  );
}
