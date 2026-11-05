"use client";

import { useState } from "react";
import { Star, StarHalf, X } from "lucide-react";
import { formatRating } from "@/lib/rating";
import { cn } from "@/lib/utils";

type StarsProps = { value: number; className?: string; starClassName?: string };

/** Read-only stars. */
export function Stars({ value, className, starClassName }: StarsProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-500", className)} aria-label={formatRating(value)}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = value >= (i + 1) * 2;
        const half = !filled && value === i * 2 + 1;
        return (
          <span key={i} className={cn("relative size-4", starClassName)}>
            <Star className="absolute inset-0 size-full text-muted-foreground/30" />
            {filled ? <Star className="absolute inset-0 size-full fill-current" /> : null}
            {half ? <StarHalf className="absolute inset-0 size-full fill-current" /> : null}
          </span>
        );
      })}
    </span>
  );
}

type StarRatingInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  disabled?: boolean;
};

/** Interactive half-star picker. Click a half to set it; click the current value (or the ×) to clear. */
export function StarRatingInput({ value, onChange, id, disabled }: StarRatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div
        id={id}
        role="radiogroup"
        aria-label="Rating"
        className={cn("flex items-center", disabled && "pointer-events-none opacity-50")}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const left = i * 2 + 1;
          const right = i * 2 + 2;
          const filled = shown >= right;
          const half = !filled && shown === left;
          return (
            <span key={i} className="relative size-7">
              <Star className="pointer-events-none absolute inset-0 size-full p-0.5 text-muted-foreground/30" />
              {filled ? <Star className="pointer-events-none absolute inset-0 size-full fill-current p-0.5 text-amber-500" /> : null}
              {half ? <StarHalf className="pointer-events-none absolute inset-0 size-full fill-current p-0.5 text-amber-500" /> : null}
              {[left, right].map((v, half) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={formatRating(v)}
                  disabled={disabled}
                  onMouseEnter={() => setHover(v)}
                  onFocus={() => setHover(v)}
                  onBlur={() => setHover(null)}
                  onClick={() => onChange(value === v ? null : v)}
                  className={cn(
                    "absolute inset-y-0 w-1/2 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    half === 0 ? "left-0" : "right-0",
                  )}
                />
              ))}
            </span>
          );
        })}
      </div>
      <span className="w-14 text-sm tabular-nums text-muted-foreground">{shown ? formatRating(shown) : "—"}</span>
      {value !== null ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Clear rating"
          className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
