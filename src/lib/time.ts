/** Relative time for feeds: "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. Pure. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(then).toLocaleDateString(undefined, { day: "numeric", month: "short", year: days > 365 ? "numeric" : undefined });
}

/** Time until a future instant: "in 45 min", "in 5 h", "in 3 days"; "expired" once passed. Pure. */
export function timeLeft(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.round((then - now) / 1000);
  if (sec <= 0) return "expired";
  if (sec < 60) return "in under a minute";
  const min = Math.round(sec / 60);
  if (min < 60) return `in ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 48) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}
