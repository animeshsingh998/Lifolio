"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Copy, ImageOff, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { importEntryBatch, resolveImportBatch, type ImportRowResult, type ResolvedRow } from "@/actions/import";
import { Stars } from "@/components/entries/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IMPORT_BATCH, RESOLVE_BATCH } from "@/lib/import/match";
import { applyRatingScale, parseImportJson, type ImportItem, type RatingScale } from "@/lib/import/parse";
import type { LookupProviderInfo, LookupResult } from "@/lib/lookup/types";
import { cn } from "@/lib/utils";
import type { Collection, CollectionField } from "@/types/domain";

type Props = {
  collection: Pick<Collection, "id" | "slug" | "name" | "item_noun" | "status_options">;
  fields: Pick<CollectionField, "label" | "lookup_key">[];
  lookup: LookupProviderInfo | null;
};

type Step = "paste" | "resolving" | "review" | "importing" | "done";

const EXAMPLE = `[
  { "title": "Arrival", "rating": 4 },
  { "title": "Dune", "rating": 4.5, "year": 2021, "date": "2024-03-01", "tags": ["sci-fi"] }
]`;

export function ImportWizard({ collection, fields, lookup }: Props) {
  const usesLookup = !!lookup?.configured;
  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState("");
  const [scale, setScale] = useState<RatingScale | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>(() => collection.status_options.find((s) => s.kind === "done")?.key ?? "");
  const [createUnmatched, setCreateUnmatched] = useState(true);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [resolved, setResolved] = useState<Map<number, ResolvedRow>>(new Map());
  const [chosen, setChosen] = useState<Map<number, number>>(new Map()); // index → candidate idx (-1 = none)
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Map<number, ImportRowResult>>(new Map());
  const cancelled = useRef(false);

  const parsed = useMemo(() => (text.trim() ? parseImportJson(text) : null), [text]);
  const effectiveScale: RatingScale = scale ?? parsed?.detectedScale ?? 5;
  const knownKeys = fields.map((f) => f.label);

  // ---- Phase A -----------------------------------------------------------------
  async function startResolve() {
    if (!parsed || parsed.items.length === 0) return;
    const scaled = applyRatingScale(parsed.items, effectiveScale);
    setItems(scaled);
    setResults(new Map());
    cancelled.current = false;

    if (!usesLookup) {
      // No provider: every row is a plain insert; go straight to review.
      const map = new Map<number, ResolvedRow>();
      for (const it of scaled) map.set(it.index, { index: it.index, candidates: [], duplicateOf: null, weak: false });
      finishResolve(scaled, map);
      return;
    }

    setStep("resolving");
    setProgress({ done: 0, total: scaled.length });
    const map = new Map<number, ResolvedRow>();
    for (let i = 0; i < scaled.length; i += RESOLVE_BATCH) {
      if (cancelled.current) break;
      const chunk = scaled.slice(i, i + RESOLVE_BATCH);
      const res = await resolveImportBatch(collection.id, chunk);
      if (!res.ok) {
        toast.error(res.error);
        for (const it of chunk) map.set(it.index, { index: it.index, candidates: [], duplicateOf: null, weak: true, error: res.error });
      } else {
        for (const row of res.data) map.set(row.index, row);
      }
      setProgress({ done: Math.min(i + chunk.length, scaled.length), total: scaled.length });
    }
    if (cancelled.current) {
      setStep("paste");
      return;
    }
    finishResolve(scaled, map);
  }

  function finishResolve(scaled: ImportItem[], map: Map<number, ResolvedRow>) {
    setResolved(map);
    const nextChosen = new Map<number, number>();
    const nextSelected = new Set<number>();
    for (const it of scaled) {
      const row = map.get(it.index);
      const hasMatch = !!row?.candidates.length;
      nextChosen.set(it.index, hasMatch ? 0 : -1);
      if (row && !row.duplicateOf && (hasMatch || !usesLookup || createUnmatched)) nextSelected.add(it.index);
    }
    setChosen(nextChosen);
    setSelected(nextSelected);
    setStep("review");
  }

  // ---- Phase B -----------------------------------------------------------------
  async function startImport(indexes: number[]) {
    const rows = items.filter((it) => indexes.includes(it.index));
    if (rows.length === 0) return;
    cancelled.current = false;
    setStep("importing");
    setProgress({ done: 0, total: rows.length });
    const next = new Map(results);
    for (let i = 0; i < rows.length; i += IMPORT_BATCH) {
      if (cancelled.current) break;
      const chunk = rows.slice(i, i + IMPORT_BATCH).map((it) => ({ ...it, match: matchFor(it.index) }));
      const res = await importEntryBatch(collection.id, chunk, { defaultStatus: defaultStatus || null, createUnmatched });
      if (!res.ok) {
        for (const it of chunk) next.set(it.index, { index: it.index, outcome: "failed", error: res.error });
      } else {
        for (const r of res.data) next.set(r.index, r);
      }
      setResults(new Map(next));
      setProgress({ done: Math.min(i + chunk.length, rows.length), total: rows.length });
    }
    setStep("done");
  }

  function matchFor(index: number): LookupResult | null {
    const row = resolved.get(index);
    const pick = chosen.get(index) ?? -1;
    return row && pick >= 0 ? (row.candidates[pick] ?? null) : null;
  }

  const counts = useMemo(() => {
    let created = 0, skipped = 0, failed = 0;
    for (const r of results.values()) {
      if (r.outcome === "created") created++;
      else if (r.outcome === "skipped") skipped++;
      else failed++;
    }
    return { created, skipped, failed };
  }, [results]);

  // ---- UI ----------------------------------------------------------------------
  if (step === "paste") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paste your list</CardTitle>
          <CardDescription>
            A JSON array; only <code>title</code> is required. Optional: <code>rating</code>, <code>year</code>, <code>status</code>,{" "}
            <code>date</code>, <code>tags</code>, <code>notes</code>
            {knownKeys.length ? <>, and your fields: {knownKeys.map((k) => <code key={k} className="mr-1">{k}</code>)}</> : null}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="import-json">JSON</FieldLabel>
                <Button type="button" variant="ghost" size="xs" onClick={() => setText(EXAMPLE)}>
                  <Copy /> Use example
                </Button>
              </div>
              <Textarea
                id="import-json"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                spellCheck={false}
                placeholder={EXAMPLE}
                className="font-mono text-xs"
              />
              {parsed ? (
                <FieldDescription className={cn(parsed.items.length === 0 && "text-destructive")}>
                  {parsed.items.length} {parsed.items.length === 1 ? "item" : "items"} recognised
                  {parsed.errors.length ? ` · ${parsed.errors.length} ${parsed.errors.length === 1 ? "problem" : "problems"}` : ""}
                </FieldDescription>
              ) : null}
              {parsed?.errors.length ? (
                <ul className="max-h-28 list-disc overflow-y-auto pl-5 text-xs text-destructive">
                  {parsed.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="import-scale">Ratings are out of</FieldLabel>
                <Select value={String(effectiveScale)} onValueChange={(v) => v && setScale(Number(v) as RatingScale)}>
                  <SelectTrigger id="import-scale" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 (4.5 → 4½ stars)</SelectItem>
                    <SelectItem value="10">10 (8 → 4 stars)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>Detected from the highest value; change it if wrong.</FieldDescription>
              </Field>
              {collection.status_options.length ? (
                <Field>
                  <FieldLabel htmlFor="import-status">Default status</FieldLabel>
                  <Select value={defaultStatus || null} onValueChange={(v) => setDefaultStatus(v ?? "")}>
                    <SelectTrigger id="import-status" className="w-full">
                      <SelectValue placeholder="No status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No status</SelectItem>
                      {collection.status_options.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>Used when an item has no status of its own.</FieldDescription>
                </Field>
              ) : null}
            </div>

            {usesLookup ? (
              <Field orientation="horizontal">
                <Checkbox id="import-unmatched" checked={createUnmatched} onCheckedChange={(c) => setCreateUnmatched(c === true)} />
                <FieldLabel htmlFor="import-unmatched">Create items that {lookup!.label} cannot find, without details or cover</FieldLabel>
              </Field>
            ) : lookup ? (
              <p className="text-sm text-muted-foreground">{lookup.label} lookup is off (no API key), so items are created without details.</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" nativeButton={false} render={<Link href={`/collections/${collection.slug}`} />}>
                Cancel
              </Button>
              <Button onClick={startResolve} disabled={!parsed || parsed.items.length === 0}>
                {usesLookup ? `Find matches on ${lookup!.label}` : "Review"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    );
  }

  if (step === "resolving" || step === "importing") {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step === "resolving" ? `Searching ${lookup?.label}…` : "Importing…"}</CardTitle>
          <CardDescription>
            {progress.done} of {progress.total} · {pct}%
            {step === "importing" ? ` · ${counts.created} created${counts.failed ? `, ${counts.failed} failed` : ""}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Keep this tab open.
            </span>
            <Button variant="ghost" size="sm" onClick={() => (cancelled.current = true)}>
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "review") {
    const dupes = items.filter((it) => resolved.get(it.index)?.duplicateOf).length;
    const unmatched = items.filter((it) => usesLookup && !resolved.get(it.index)?.candidates.length).length;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review matches</CardTitle>
          <CardDescription>
            {items.length} items · {selected.size} selected
            {dupes ? ` · ${dupes} already in ${collection.name} (unticked)` : ""}
            {unmatched ? ` · ${unmatched} not found` : ""}
            {usesLookup ? ". Change a match with its dropdown; amber rows deserve a second look." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Button variant="ghost" size="xs" onClick={() => setSelected(new Set(items.filter((it) => !resolved.get(it.index)?.duplicateOf).map((it) => it.index)))}>
              Select all new
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>
              Select none
            </Button>
          </div>

          <ul className="divide-y overflow-hidden rounded-xl border">
            {items.map((it) => {
              const row = resolved.get(it.index);
              const pick = chosen.get(it.index) ?? -1;
              const match = pick >= 0 ? row?.candidates[pick] : undefined;
              const isSelected = selected.has(it.index);
              const flag = row?.duplicateOf ? "duplicate" : row?.error ? "error" : usesLookup && !match ? "unmatched" : row?.weak ? "weak" : null;
              return (
                <li key={it.index} className={cn("flex items-center gap-3 px-3 py-2", flag === "weak" && "bg-amber-500/5", !isSelected && "opacity-60")}>
                  <Checkbox
                    checked={isSelected}
                    aria-label={`Import ${it.title}`}
                    onCheckedChange={(c) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (c === true) next.add(it.index);
                        else next.delete(it.index);
                        return next;
                      })
                    }
                  />
                  <span className="flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {match?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={match.thumbnailUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <ImageOff className="size-3.5 text-muted-foreground/60" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{it.title}</span>
                      {it.year ? <span className="text-xs text-muted-foreground">{it.year}</span> : null}
                      {it.rating !== null ? <Stars value={it.rating} starClassName="size-3" /> : null}
                    </span>
                    {usesLookup && row ? (
                      row.candidates.length ? (
                        <Select value={String(pick)} onValueChange={(v) => v !== null && setChosen((prev) => new Map(prev).set(it.index, Number(v)))}>
                          <SelectTrigger size="sm" className="mt-1 h-7 max-w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {row.candidates.map((c, i) => (
                              <SelectItem key={c.externalId} value={String(i)}>
                                {c.title}
                                {c.subtitle ? ` — ${c.subtitle}` : ""}
                              </SelectItem>
                            ))}
                            <SelectItem value="-1">No match (create without details)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="block text-xs text-muted-foreground">{row.error ? row.error : `Not found on ${lookup!.label}`}</span>
                      )
                    ) : null}
                  </span>
                  {flag === "duplicate" ? (
                    <Badge variant="outline" title={`Already in ${collection.name} as “${row!.duplicateOf!.title}”`}>
                      exists
                    </Badge>
                  ) : flag === "weak" ? (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                      <AlertTriangle /> check
                    </Badge>
                  ) : flag === "unmatched" || flag === "error" ? (
                    <Badge variant="outline">no match</Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep("paste")}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={() => startImport(Array.from(selected))} disabled={selected.size === 0}>
              Import {selected.size} {selected.size === 1 ? collection.item_noun : `${collection.item_noun}s`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // done
  const failedIndexes = Array.from(results.values()).filter((r) => r.outcome === "failed").map((r) => r.index);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import finished</CardTitle>
        <CardDescription>
          {counts.created} created · {counts.skipped} skipped · {counts.failed} failed
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="max-h-96 divide-y overflow-y-auto rounded-xl border text-sm">
          {items
            .filter((it) => results.has(it.index))
            .map((it) => {
              const r = results.get(it.index)!;
              return (
                <li key={it.index} className="flex items-center gap-3 px-3 py-2">
                  {r.outcome === "created" ? (
                    <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : r.outcome === "skipped" ? (
                    <span className="size-4 shrink-0 text-center text-muted-foreground">–</span>
                  ) : (
                    <X className="size-4 shrink-0 text-destructive" />
                  )}
                  <span className="min-w-0 flex-1">
                    {r.outcome === "created" ? (
                      <Link href={`/collections/${collection.slug}/${r.id}`} className="truncate font-medium underline-offset-4 hover:underline">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">{it.title}</span>
                    )}
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.outcome === "created" ? (r.warning ?? "") : r.outcome === "skipped" ? r.reason : r.error}
                    </span>
                  </span>
                </li>
              );
            })}
        </ul>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={() => setStep("paste")}>
            Import more
          </Button>
          <div className="flex gap-2">
            {failedIndexes.length ? (
              <Button variant="outline" onClick={() => startImport(failedIndexes)}>
                <RotateCcw /> Retry {failedIndexes.length} failed
              </Button>
            ) : null}
            <Button nativeButton={false} render={<Link href={`/collections/${collection.slug}`} />}>
              Open {collection.name}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
