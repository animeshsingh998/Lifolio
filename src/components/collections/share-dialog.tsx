"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { createShareLink, revokeShareLink, type CreatedShareLink } from "@/actions/share";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ShareLink } from "@/lib/queries/share";
import { SHARE_DURATIONS, type ShareHours } from "@/lib/share/durations";
import { timeLeft } from "@/lib/time";

type ShareDialogProps = { collectionId: string; collectionName: string; links: ShareLink[] };

/** Header button + dialog: mint a time-limited public link, copy it, see and revoke active links. */
export function ShareDialog({ collectionId, collectionName, links }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState<ShareHours>(24);
  const [created, setCreated] = useState<CreatedShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);

  function create() {
    startTransition(async () => {
      const result = await createShareLink(collectionId, hours);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreated(result.data);
      setCopied(false);
    });
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  function revoke(id: string) {
    setRevoking(id);
    startTransition(async () => {
      const result = await revokeShareLink(id);
      setRevoking(null);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Link revoked");
        if (created?.id === id) setCreated(null);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="icon" aria-label="Share collection" title="Share collection" onClick={() => setOpen(true)}>
        <Share2 />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setCreated(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share “{collectionName}”</DialogTitle>
            <DialogDescription>
              Anyone with the link can browse this collection, read-only, until it expires. You can revoke a link at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Link valid for</span>
              <ToggleGroup
                variant="outline"
                size="sm"
                value={[String(hours)]}
                onValueChange={(v) => v[0] && setHours(Number(v[0]) as ShareHours)}
                aria-label="Validity"
                className="flex-wrap"
              >
                {SHARE_DURATIONS.map((d) => (
                  <ToggleGroupItem key={d.hours} value={String(d.hours)}>
                    {d.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {created ? (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <Input readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" aria-label="Share link" />
                  <Button type="button" size="icon" variant="secondary" onClick={copy} aria-label="Copy link">
                    {copied ? <Check /> : <Copy />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Expires {timeLeft(created.expires_at)}. This is the only time the full link is shown.</p>
              </div>
            ) : null}

            <Button type="button" onClick={create} disabled={isPending} className="self-start">
              {isPending && !revoking ? <Loader2 className="animate-spin" /> : <Link2 />}
              {created ? "Create another link" : "Create link"}
            </Button>

            {links.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Active links</span>
                <ul className="divide-y rounded-lg border">
                  {links.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="flex flex-col">
                        <span>Expires {timeLeft(l.expires_at)}</span>
                        <span className="text-xs text-muted-foreground">created {new Date(l.created_at).toLocaleString()}</span>
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => revoke(l.id)} disabled={revoking === l.id} className="text-destructive hover:text-destructive">
                        {revoking === l.id ? <Loader2 className="animate-spin" /> : <X />} Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
