import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

/** Shown for unknown, expired or revoked share tokens. Deliberately does not say which. */
export function ShareUnavailable() {
  return (
    <EmptyState
      icon={LinkIcon}
      title="This link is no longer available"
      description="It may have expired or been revoked by its owner. Ask them for a new one."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Go to Lifolio
        </Button>
      }
    />
  );
}
