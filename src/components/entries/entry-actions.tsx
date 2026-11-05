"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEntry, toggleFavorite } from "@/actions/entries";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EntryActionsProps = { entryId: string; title: string; isFavorite: boolean; collectionSlug: string };

export function EntryActions({ entryId, title, isFavorite, collectionSlug }: EntryActionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [favorite, setOptimisticFavorite] = useOptimistic(isFavorite);

  function onToggleFavorite() {
    startTransition(async () => {
      setOptimisticFavorite(!favorite);
      const result = await toggleFavorite(entryId, !favorite);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-pressed={favorite}
        aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
        onClick={onToggleFavorite}
      >
        <Heart className={cn(favorite && "fill-rose-500 text-rose-500")} />
      </Button>
      <Button variant="outline" nativeButton={false} render={<Link href={`/collections/${collectionSlug}/${entryId}/edit`} />}>
        <Pencil /> Edit
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" aria-label="Delete entry" className="text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        }
        title={`Delete “${title}”?`}
        description="This removes the entry permanently."
        onConfirm={async () => {
          const result = await deleteEntry(entryId);
          if (!result.ok) return result.error;
          toast.success(`Deleted ${title}`);
          router.push(`/collections/${collectionSlug}`);
        }}
      />
    </div>
  );
}
