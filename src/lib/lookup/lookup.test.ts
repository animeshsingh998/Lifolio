import { describe, expect, it } from "vitest";
import { buildBooksQuery, mapOpenLibraryDoc, mapVolume } from "./providers/google-books";
import { mapMovieDetails, mapMovieSearch, mapTvDetails } from "./providers/tmdb";
import { templates } from "@/lib/collections/templates";
import { googleBooks } from "./providers/google-books";
import { tmdbMovie, tmdbTv } from "./providers/tmdb";

describe("TMDB mapping", () => {
  it("maps a movie search result", () => {
    const [r] = mapMovieSearch([
      { id: 27205, title: "Inception", original_title: "Inception", release_date: "2010-07-15", poster_path: "/x.jpg", overview: "Cobb…" },
    ]);
    expect(r.externalId).toBe("27205");
    expect(r.subtitle).toBe("2010");
    expect(r.thumbnailUrl).toBe("https://image.tmdb.org/t/p/w185/x.jpg");
    expect(r.imageUrl).toBe("https://image.tmdb.org/t/p/w780/x.jpg");
    expect(r.values.release_year).toBe(2010);
  });

  it("maps movie details with director, genres and runtime", () => {
    const r = mapMovieDetails({
      id: 27205,
      title: "Inception",
      release_date: "2010-07-15",
      poster_path: null,
      runtime: 148,
      genres: [{ id: 1, name: "Action" }, { id: 2, name: "Science Fiction" }],
      credits: { crew: [{ job: "Producer", name: "Emma Thomas" }, { job: "Director", name: "Christopher Nolan" }] },
    });
    expect(r.values).toMatchObject({ director: "Christopher Nolan", genres: "Action, Science Fiction", runtime: 148, release_year: 2010 });
    expect(r.imageUrl).toBeNull();
    expect(r.subtitle).toBe("2010 · Christopher Nolan");
  });

  it("maps TV details", () => {
    const r = mapTvDetails({
      id: 1396,
      name: "Breaking Bad",
      first_air_date: "2008-01-20",
      number_of_seasons: 5,
      number_of_episodes: 62,
      created_by: [{ name: "Vince Gilligan" }],
      networks: [{ name: "AMC" }],
      genres: [{ id: 1, name: "Drama" }],
      status: "Ended",
    });
    expect(r.values).toMatchObject({ creator: "Vince Gilligan", first_air_year: 2008, seasons: 5, episodes: 62, network: "AMC", status: "Ended" });
  });
});

describe("Google Books mapping", () => {
  it("maps a volume and prefers ISBN-13 and the largest image", () => {
    const r = mapVolume({
      id: "abc",
      volumeInfo: {
        title: "Dune",
        authors: ["Frank Herbert"],
        publishedDate: "1965-08-01",
        pageCount: 412,
        categories: ["Fiction"],
        publisher: "Chilton",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0441013597" },
          { type: "ISBN_13", identifier: "9780441013593" },
        ],
        imageLinks: { thumbnail: "http://books.google.com/t.jpg&edge=curl", medium: "http://books.google.com/m.jpg" },
      },
    });
    expect(r.values).toMatchObject({ authors: "Frank Herbert", page_count: 412, published_year: 1965, isbn: "9780441013593" });
    expect(r.thumbnailUrl).toBe("https://books.google.com/t.jpg");
    expect(r.imageUrl).toBe("https://books.google.com/m.jpg");
    expect(r.subtitle).toBe("Frank Herbert · 1965");
  });

  it("maps an Open Library doc to the same output keys", () => {
    const r = mapOpenLibraryDoc({
      key: "/works/OL20806514W",
      title: "Surrounded by Idiots",
      author_name: ["Thomas Erikson"],
      first_publish_year: 2014,
      number_of_pages_median: 304,
      isbn: ["1250179939", "9781250179937"],
      cover_i: 10105591,
      subject: ["Sociology", "Communication", "Psychology", "Extra"],
      publisher: ["Penguin Random House"],
    });
    expect(r.externalId).toBe("ol:OL20806514W");
    expect(r.imageUrl).toBe("https://covers.openlibrary.org/b/id/10105591-L.jpg");
    expect(r.values).toMatchObject({ authors: "Thomas Erikson", page_count: 304, published_year: 2014, isbn: "9781250179937", categories: "Sociology, Communication, Psychology" });
    expect(Object.keys(r.values).sort()).toEqual(Object.keys(mapVolume({ id: "x" }).values).sort());
  });

  it("detects ISBN queries", () => {
    expect(buildBooksQuery("978-0441013593")).toBe("isbn:9780441013593");
    expect(buildBooksQuery("0441013597")).toBe("isbn:0441013597");
    expect(buildBooksQuery("dune herbert")).toBe("dune herbert");
  });
});

describe("templates bind only to real provider outputs", () => {
  const outputs = { tmdb_movie: tmdbMovie.outputs, tmdb_tv: tmdbTv.outputs, google_books: googleBooks.outputs };
  it("every lookup_key in a template exists on its provider", () => {
    for (const t of templates) {
      if (!t.lookupProvider) continue;
      for (const f of t.fields) {
        if (!f.lookupKey) continue;
        expect(Object.keys(outputs[t.lookupProvider]), `${t.id}.${f.key}`).toContain(f.lookupKey);
      }
    }
  });
});
