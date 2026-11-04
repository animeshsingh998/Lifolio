import Link from "next/link";
import { Library } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="An overview of everything you track." />
      <EmptyState
        icon={Library}
        title="Nothing here yet"
        description="Stats, recent items and activity will appear once you have collections with entries."
        action={
          <Button variant="outline" render={<Link href="/collections" />}>
            Go to collections
          </Button>
        }
      />
    </>
  );
}
