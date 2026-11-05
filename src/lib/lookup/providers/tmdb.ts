/**
 * TMDB providers for movies and TV. Works with either a v3 API key or a v4 read
 * access token in TMDB_API_KEY. Responses are cached for a day by Next's fetch cache.
 * Mapping functions are pure and unit-tested.
 */
import { fetchWithRetry } from "../fetch-retry";
import type { LookupProvider, LookupResult } from "../types";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const THUMB_SIZE = "w185";
const FULL_SIZE = "w780";
const ATTRIBUTION = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

function apiKey() {
  return process.env.TMDB_API_KEY?.trim() ?? "";
}

async function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = apiKey();
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  const res = await fetchWithRetry(url, { headers, next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return (await res.json()) as T;
}

export function posterUrl(path: string | null | undefined, size: string = FULL_SIZE): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}

const year = (date: string | null | undefined) => (date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);
const names = (list: { name: string }[] | undefined) => (list?.length ? list.map((x) => x.name).join(", ") : null);

// ---- Movies -----------------------------------------------------------------

export type TmdbMovieSearchItem = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
};
export type TmdbMovieDetails = TmdbMovieSearchItem & {
  runtime?: number | null;
  tagline?: string;
  genres?: { id: number; name: string }[];
  credits?: { crew?: { job: string; name: string }[] };
};

export function mapMovieSearch(items: TmdbMovieSearchItem[]): LookupResult[] {
  return items.slice(0, 10).map((m) => ({
    externalId: String(m.id),
    title: m.title,
    subtitle: [year(m.release_date), m.original_title !== m.title ? m.original_title : null].filter(Boolean).join(" · ") || undefined,
    thumbnailUrl: posterUrl(m.poster_path, THUMB_SIZE),
    imageUrl: posterUrl(m.poster_path),
    values: { release_year: year(m.release_date), overview: m.overview || null },
  }));
}

export function mapMovieDetails(m: TmdbMovieDetails): LookupResult {
  const directors = m.credits?.crew?.filter((c) => c.job === "Director").map((c) => c.name) ?? [];
  return {
    externalId: String(m.id),
    title: m.title,
    subtitle: [year(m.release_date), directors[0]].filter(Boolean).join(" · ") || undefined,
    thumbnailUrl: posterUrl(m.poster_path, THUMB_SIZE),
    imageUrl: posterUrl(m.poster_path),
    values: {
      director: directors.length ? directors.join(", ") : null,
      release_year: year(m.release_date),
      genres: names(m.genres),
      runtime: m.runtime ?? null,
      overview: m.overview || null,
      tagline: m.tagline || null,
      original_title: m.original_title ?? null,
    },
  };
}

export const tmdbMovie: LookupProvider = {
  id: "tmdb_movie",
  label: "TMDB",
  attribution: ATTRIBUTION,
  outputs: {
    director: { label: "Director", type: "text" },
    release_year: { label: "Release year", type: "number" },
    genres: { label: "Genres", type: "text" },
    runtime: { label: "Runtime (min)", type: "number" },
    overview: { label: "Overview", type: "textarea" },
    tagline: { label: "Tagline", type: "text" },
    original_title: { label: "Original title", type: "text" },
  },
  isConfigured: () => apiKey().length > 0,
  async search(query) {
    const data = await tmdbFetch<{ results: TmdbMovieSearchItem[] }>("/search/movie", {
      query,
      include_adult: "false",
      language: "en-US",
      page: "1",
    });
    return mapMovieSearch(data.results ?? []);
  },
  async details(externalId) {
    if (!/^\d+$/.test(externalId)) return null;
    const data = await tmdbFetch<TmdbMovieDetails>(`/movie/${externalId}`, {
      append_to_response: "credits",
      language: "en-US",
    });
    return mapMovieDetails(data);
  },
};

// ---- TV ---------------------------------------------------------------------

export type TmdbTvSearchItem = {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
};
export type TmdbTvDetails = TmdbTvSearchItem & {
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  created_by?: { name: string }[];
  networks?: { name: string }[];
  genres?: { id: number; name: string }[];
};

export function mapTvSearch(items: TmdbTvSearchItem[]): LookupResult[] {
  return items.slice(0, 10).map((t) => ({
    externalId: String(t.id),
    title: t.name,
    subtitle: [year(t.first_air_date), t.original_name !== t.name ? t.original_name : null].filter(Boolean).join(" · ") || undefined,
    thumbnailUrl: posterUrl(t.poster_path, THUMB_SIZE),
    imageUrl: posterUrl(t.poster_path),
    values: { first_air_year: year(t.first_air_date), overview: t.overview || null },
  }));
}

export function mapTvDetails(t: TmdbTvDetails): LookupResult {
  return {
    externalId: String(t.id),
    title: t.name,
    subtitle: [year(t.first_air_date), names(t.networks)?.split(", ")[0]].filter(Boolean).join(" · ") || undefined,
    thumbnailUrl: posterUrl(t.poster_path, THUMB_SIZE),
    imageUrl: posterUrl(t.poster_path),
    values: {
      creator: names(t.created_by),
      first_air_year: year(t.first_air_date),
      seasons: t.number_of_seasons ?? null,
      episodes: t.number_of_episodes ?? null,
      genres: names(t.genres),
      network: names(t.networks),
      status: t.status ?? null,
      overview: t.overview || null,
    },
  };
}

export const tmdbTv: LookupProvider = {
  id: "tmdb_tv",
  label: "TMDB",
  attribution: ATTRIBUTION,
  outputs: {
    creator: { label: "Created by", type: "text" },
    first_air_year: { label: "First aired", type: "number" },
    seasons: { label: "Seasons", type: "number" },
    episodes: { label: "Episodes", type: "number" },
    genres: { label: "Genres", type: "text" },
    network: { label: "Network", type: "text" },
    status: { label: "Status", type: "text" },
    overview: { label: "Overview", type: "textarea" },
  },
  isConfigured: () => apiKey().length > 0,
  async search(query) {
    const data = await tmdbFetch<{ results: TmdbTvSearchItem[] }>("/search/tv", {
      query,
      include_adult: "false",
      language: "en-US",
      page: "1",
    });
    return mapTvSearch(data.results ?? []);
  },
  async details(externalId) {
    if (!/^\d+$/.test(externalId)) return null;
    const data = await tmdbFetch<TmdbTvDetails>(`/tv/${externalId}`, { append_to_response: "credits", language: "en-US" });
    return mapTvDetails(data);
  },
};
