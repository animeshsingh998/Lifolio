import { notFound } from "next/navigation";
import { ImportWizard } from "@/components/import/import-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { providerInfo } from "@/lib/lookup/registry";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";

type Props = { params: Promise<{ slug: string }> };

// Import batches do several network calls each; allow more than the default function time.
export const maxDuration = 60;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  return { title: collection ? `Import into ${collection.name}` : "Import" };
}

export default async function ImportPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const fields = await getCollectionFields(collection.id);
  const lookup = providerInfo(collection.lookup_provider);

  return (
    <>
      <PageHeader
        title={`Import into ${collection.name}`}
        description={
          lookup?.configured
            ? `Paste a list, pick the right ${lookup.label} matches, and we add the ${collection.item_noun}s with covers and details.`
            : `Paste a list and we add the ${collection.item_noun}s.`
        }
      />
      <div className="max-w-3xl">
        <ImportWizard
          collection={{ id: collection.id, slug: collection.slug, name: collection.name, item_noun: collection.item_noun, status_options: collection.status_options }}
          fields={fields.map((f) => ({ label: f.label, lookup_key: f.lookup_key }))}
          lookup={lookup}
        />
      </div>
    </>
  );
}
