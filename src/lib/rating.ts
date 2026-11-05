/** Rating is stored 0–10 and shown as five stars with halves (so 7 → "3.5 / 5"). Pure: safe on server and client. */
export function formatRating(value: number): string {
  return `${(value / 2).toLocaleString(undefined, { maximumFractionDigits: 1 })} / 5`;
}
