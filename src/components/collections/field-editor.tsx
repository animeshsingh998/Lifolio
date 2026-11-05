"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteField, reorderFields } from "@/actions/fields";
import { FieldDialog } from "./field-dialog";
import { SortableList } from "@/components/dnd/sortable-list";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldDefinitions } from "@/lib/fields/definitions";
import type { CollectionField } from "@/types/domain";

export function FieldEditor({ collectionId, fields }: { collectionId: string; fields: CollectionField[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; field: CollectionField | null }>({ open: false, field: null });
  const [pending, startTransition] = useTransition();
  // Optimistic order while the reorder action runs; server data wins once it returns.
  const [order, setOptimisticOrder] = useOptimistic(fields);

  function handleReorder(next: CollectionField[]) {
    startTransition(async () => {
      setOptimisticOrder(next);
      const result = await reorderFields({ collectionId, orderedIds: next.map((f) => f.id) });
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom fields</CardTitle>
        <CardDescription>Drag to reorder. Fields marked “card” also show in the grid and list views.</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setDialog({ open: true, field: null })}>
            <Plus /> Add field
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {order.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No custom fields yet. Add one to capture what matters for this collection.
          </p>
        ) : (
          <SortableList
            items={order}
            getId={(f) => f.id}
            onReorder={handleReorder}
            disabled={pending}
            renderItem={(f) => (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{f.label}</span>
                    {f.required ? <Badge variant="outline">required</Badge> : null}
                    {f.show_in_card ? <Badge variant="outline">card</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {fieldDefinitions[f.type].label}
                    {f.type === "select" && f.options.choices ? ` · ${f.options.choices.join(", ")}` : ""}
                    {f.type === "number" && f.options.unit ? ` · ${f.options.unit}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${f.label}`}
                  onClick={() => setDialog({ open: true, field: f })}
                >
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.label}`} className="text-muted-foreground hover:text-destructive">
                      <Trash2 />
                    </Button>
                  }
                  title={`Delete “${f.label}”?`}
                  description="The field and its values on every entry in this collection will be removed. This cannot be undone."
                  onConfirm={async () => {
                    const result = await deleteField(f.id);
                    if (!result.ok) return result.error;
                    toast.success(`Deleted ${f.label}`);
                  }}
                />
              </>
            )}
          />
        )}
      </CardContent>

      <FieldDialog
        collectionId={collectionId}
        field={dialog.field}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </Card>
  );
}
