"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  /** The element that opens the dialog, e.g. a destructive Button. */
  trigger: React.ReactElement;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  /** Runs inside a transition; resolve to an error message to keep the dialog open. */
  onConfirm: () => Promise<string | void> | string | void;
};

/** Destructive-action confirmation with a pending state and inline error. */
export function ConfirmDialog({ trigger, title, description, confirmLabel = "Delete", onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (typeof result === "string") setError(result);
      else setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : setOpen(next))}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
