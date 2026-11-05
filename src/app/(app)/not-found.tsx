import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Not found"
      description="This page or item does not exist, or it belongs to another account."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/collections" />}>
          Back to collections
        </Button>
      }
    />
  );
}
