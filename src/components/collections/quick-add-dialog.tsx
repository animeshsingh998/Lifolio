"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CollectionIcon } from "./collection-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { CollectionSummary } from "@/types/domain";

/** Sidebar "Quick add": pick a collection, land on its new-entry form in one step. */
export function QuickAddButton({ collections }: { collections: CollectionSummary[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SidebarMenuButton tooltip="Quick add" onClick={() => setOpen(true)} className="text-primary hover:text-primary data-[active=true]:text-primary">
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Plus className="size-3" strokeWidth={3} />
        </span>
        <span className="font-medium">Quick add</span>
      </SidebarMenuButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to…</DialogTitle>
            <DialogDescription>Choose a collection to open its new-entry form.</DialogDescription>
          </DialogHeader>
          {collections.length === 0 ? (
            <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
              You have no collections yet.
              <Button nativeButton={false} render={<Link href="/collections" onClick={() => setOpen(false)} />}>
                Create one
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {collections.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/collections/${c.slug}/new`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-foreground/20 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <CollectionIcon name={c.icon} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">New {c.item_noun}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
