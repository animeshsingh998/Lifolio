export const SITE_NAME = "Lifolio";

/** Whether new accounts may be created. Controlled by env so it can be turned off after launch. */
export const ALLOW_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

/** Public origin used in auth emails. Prefers an explicit setting, then Vercel's production URL. */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
