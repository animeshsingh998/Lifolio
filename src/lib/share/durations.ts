/** Validity choices offered in the share dialog, in hours. Pure (shared by client and server). */
export const SHARE_DURATIONS = [
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 24, label: "1 day" },
  { hours: 168, label: "7 days" },
] as const;
export type ShareHours = (typeof SHARE_DURATIONS)[number]["hours"];
