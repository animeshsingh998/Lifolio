"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { optimiseCoverBatch } from "@/actions/covers";
import { Button } from "@/components/ui/button";

type Progress = { done: number; failed: number; remaining: number };

/** Runs the one-off cover re-encode in batches until nothing is left. */
export function OptimiseCoversButton({ initialRemaining }: { initialRemaining: number }) {
  const [progress, setProgress] = useState<Progress>({ done: 0, failed: 0, remaining: initialRemaining });
  const [isPending, startTransition] = useTransition();
  const stop = useRef(false);

  function run() {
    stop.current = false;
    startTransition(async () => {
      let next = progress;
      // Each call converts a few covers; keep going until the server reports none left or a call fails.
      while (!stop.current) {
        const result = await optimiseCoverBatch();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const { converted, failed, remaining } = result.data;
        next = { done: next.done + converted, failed: next.failed + failed, remaining };
        setProgress(next);
        if (remaining === 0 || converted + failed === 0) break;
      }
      if (next.remaining === 0) toast.success(next.failed ? `Done, ${next.failed} could not be converted` : "All covers optimised");
    });
  }

  const finished = progress.remaining === 0;
  const label = finished ? "All covers optimised" : isPending ? "Optimising…" : `Optimise ${progress.remaining} ${progress.remaining === 1 ? "cover" : "covers"}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={run} disabled={isPending || finished} variant="outline">
        {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {label}
      </Button>
      {isPending ? (
        <Button variant="ghost" size="sm" onClick={() => (stop.current = true)}>
          Stop after this batch
        </Button>
      ) : null}
      {progress.done + progress.failed > 0 ? (
        <span className="text-sm text-muted-foreground">
          {progress.done} converted{progress.failed ? `, ${progress.failed} failed` : ""}
          {progress.remaining ? `, ${progress.remaining} to go` : ""}
        </span>
      ) : null}
    </div>
  );
}
