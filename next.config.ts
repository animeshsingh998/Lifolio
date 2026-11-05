import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Private bucket, served through signed URLs.
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/sign/**" }] : []),
      // Lookup picker thumbnails (not stored; the chosen image is copied into the bucket on save).
      { protocol: "https" as const, hostname: "image.tmdb.org" },
      { protocol: "https" as const, hostname: "books.google.com" },
      { protocol: "https" as const, hostname: "books.googleusercontent.com" },
    ],
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
