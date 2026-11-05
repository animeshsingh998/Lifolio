"use client";

import { Trash2 } from "lucide-react";
import { deleteCollection } from "@/actions/collections";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DeleteCollection({ id, name, entryCount }: { id: string; name: string; entryCount: number }) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Delete collection</CardTitle>
        <CardDescription>Removes the collection, its fields and all of its entries. There is no undo.</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          trigger={
            <Button variant="destructive">
              <Trash2 /> Delete {name}
            </Button>
          }
          title={`Delete “${name}”?`}
          description={
            entryCount > 0
              ? `This permanently deletes ${entryCount} ${entryCount === 1 ? "entry" : "entries"} and the collection itself.`
              : "This permanently deletes the collection."
          }
          confirmLabel="Delete collection"
          onConfirm={async () => {
            const result = await deleteCollection(id);
            // On success the action redirects, so we only get here on failure.
            if (result && !result.ok) return result.error;
          }}
        />
      </CardContent>
    </Card>
  );
}
