import { Clock } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Timeline" };

export default function TimelinePage() {
  return (
    <>
      <PageHeader title="Timeline" description="A chronological view of what you watched, read, bought and achieved." />
      <EmptyState icon={Clock} title="Coming later" description="The timeline is planned for Phase 4." />
    </>
  );
}
