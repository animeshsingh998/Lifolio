"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function CollectionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={
        process.env.NODE_ENV === "development"
          ? error.message
          : "Could not load this page. If the problem persists, check that the database migrations have been applied."
      }
      action={
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
