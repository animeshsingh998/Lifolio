"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Link2, Loader2, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { discardUploadedImage, uploadEntryImage } from "@/actions/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { emptyCover, type CoverInput } from "@/lib/fields/schema";
import type { LookupProviderInfo } from "@/lib/lookup/types";

type CoverPickerProps = {
  value: CoverInput;
  onChange: (value: CoverInput) => void;
  /** Signed URL of the image the entry already has (edit mode). */
  initialPath: string | null;
  initialUrl: string | null;
  lookup: LookupProviderInfo | null;
  onOpenLookup: () => void;
  disabled?: boolean;
  error?: string;
};

/**
 * Cover image control for the entry form. Three sources: provider lookup,
 * a pasted image URL (downloaded on save), or a file upload (stored immediately).
 */
export function CoverPicker({ value, onChange, initialPath, initialUrl, lookup, onOpenLookup, disabled, error }: CoverPickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [uploading, startUpload] = useTransition();

  // source_url passes through a Zod preprocess, so its input type is unknown.
  const sourceUrl = typeof value.source_url === "string" && value.source_url ? value.source_url : null;
  const preview = sourceUrl ?? (value.path ? (value.path === initialPath ? initialUrl : uploadedUrl) : null);

  /** An upload that was never saved is removed again when replaced or cleared. */
  function discardPendingUpload() {
    if (value.path && value.path !== initialPath && value.image_source === "upload") void discardUploadedImage(value.path);
  }

  function set(next: CoverInput) {
    discardPendingUpload();
    onChange(next);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startUpload(async () => {
      const result = await uploadEntryImage(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUploadedUrl(result.data.url || null);
      set({ ...emptyCover, path: result.data.path, image_source: "upload" });
    });
  }

  function applyUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    set({ ...emptyCover, source_url: url, image_source: "url" });
    setUrlOpen(false);
    setUrlDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-[3/4] w-36 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-muted to-muted/40">
        {preview ? (
          // Previews may come from any host the user pasted; plain <img> is intentional here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Cover preview" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-muted-foreground/50" />
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin" />
          </span>
        ) : null}
      </div>

      <div className="flex w-36 flex-col gap-1.5">
        {lookup?.configured ? (
          <Button type="button" variant="outline" size="sm" onClick={onOpenLookup} disabled={disabled}>
            <Search /> Search {lookup.label}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={disabled || uploading}>
          <Upload /> Upload
        </Button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={onFile} />
        <Popover open={urlOpen} onOpenChange={setUrlOpen}>
          <PopoverTrigger render={<Button type="button" variant="outline" size="sm" disabled={disabled} />}>
            <Link2 /> From URL
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Paste a direct link to a JPEG, PNG or WebP image. It is copied into your library when you save.</p>
              <Input
                autoFocus
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                }}
              />
              <Button type="button" size="sm" onClick={applyUrl} disabled={!urlDraft.trim()}>
                Use image
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {preview ? (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => set(emptyCover)} disabled={disabled}>
            <Trash2 /> Remove
          </Button>
        ) : null}
      </div>
      {error ? <p className="w-36 text-xs text-destructive">{error}</p> : null}
      {lookup && !lookup.configured ? (
        <p className="w-36 text-[11px] leading-snug text-muted-foreground">{lookup.label} lookup is off until its API key is set.</p>
      ) : null}
    </div>
  );
}
