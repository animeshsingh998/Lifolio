import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Collections" };

export default function CollectionsPage() {
  return (
    <>
      <PageHeader title="Collections" description="Everything you track, grouped the way you like." />
      <EmptyState
        icon={FolderPlus}
        title="No collections yet"
        description="Creating collections (Movies, Books, Watches, or anything else) arrives in Phase 2."
      />
    </>
  );
}
