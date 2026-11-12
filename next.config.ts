import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Covers are resized to web size once at upload (lib/images/process.ts) and served as-is from
  // Supabase, so Vercel's per-request image optimisation (metered, and defeated by hourly signed URLs) is off.
  images: { unoptimized: true },
  experimental: {
    // Entry-form uploads go through a Server Action; the app-level cap is 8 MB plus multipart overhead.
    serverActions: { bodySizeLimit: "9mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
