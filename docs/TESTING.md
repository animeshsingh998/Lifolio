# Lifolio — Test checklist

Walk through after each phase on `npm run dev` (or the Vercel URL). When something fails, report:
the URL, what you clicked, and the exact error text from the red Next.js overlay (or a screenshot).

## Phase 2 — Collections & entries

**Before you start:** run `supabase/migrations/0002_collections.sql` in the Supabase SQL editor
(paste the whole file; it is safe to run twice). Without it every collections page shows
"relation … does not exist".

1. **Collections page** `/collections` shows an empty state with "Create your first collection".
2. **Create from template**: pick Movies → Create. You land on `/collections/movies`, the sidebar
   lists Movies, the name field pre-fills when you switch templates (until you type your own).
3. **Add a movie**: title, status, half-star rating (click left/right half of a star, click again
   to clear), date, Director, Release year, Watched on (dropdown), Would rewatch, tags (Enter or
   comma), notes, favourite. Save → detail page shows all of it.
4. **Grid card** shows director · year, status badge, stars, date, heart for favourites.
5. **List view** toggle (top-right) → rows; reload → still list (persisted per collection).
6. **Edit** the entry → changes stick. **Heart** on the detail page toggles instantly. **Delete**
   → back to the list, entry gone, sidebar count down.
7. **Validation**: empty title, year 1600, a link without `https://`, text in a number field,
   a required field left empty → inline red messages; nothing saved.
8. **Collection settings** (gear icon): rename, change icon, description, item name, default view;
   turn rating off → entry form hides it; change the date label → entry form uses it.
9. **Statuses**: rename one, drag to reorder (grip handle), add one, remove one that an entry
   uses → save → that entry shows no status.
10. **Fields**: add one of each type (text, long text, number with min/max/unit, dropdown,
    date, link, checkbox); mark one required and one "show on cards"; drag to reorder; edit a
    label (type is locked); delete a field → its value disappears from existing entries.
11. **Blank collection** "Fragrances" with 5 custom fields → add two entries. This is the
    Phase 2 acceptance test.
12. **Delete a collection** (bottom of settings) → back to `/collections`, sidebar updated.
13. **Not found**: `/collections/nope` and `/collections/movies/not-a-uuid` show a Not found page.
14. **Isolation** (optional): sign up a second account in a private window → it sees no
    collections from the first.
15. **Look & feel**: light and dark mode, phone width (sidebar becomes a drawer), keyboard
    Tab through the entry form, dropdowns and dialogs close with Esc.

## Phase 3.1 — Images & lookup

**Before you start:** `TMDB_API_KEY` must be in `.env.local` and the dev server restarted after adding it.
Storage migration 0003 is already applied.

1. **Movies → Add movie**: the title row has a **Find** button and the cover box a **Search TMDB** button.
   Type "Inception" → results with posters appear after a short pause; pick one → title, poster preview,
   Director, Release year, Genre, Runtime fill in. Edit anything, save → detail page shows the poster.
2. **Grid and list** show the poster; the sidebar count updates as before.
3. **TV Shows**: same with "Severance" → Created by, First aired, Seasons, Genre.
4. **Books**: "Dune Herbert" or an ISBN like `9780441013593` → Author, Pages, Published, ISBN, cover.
5. **Upload**: on a watch, click Upload, choose a JPEG/PNG under 8 MB → preview appears at once; save →
   cover shows everywhere. Edit → Remove → save → placeholder is back.
6. **From URL**: paste a direct image link (ends in .jpg/.png) → save → image is copied into your storage
   (the detail page URL points at Supabase, not the original site). A non-image URL shows an error under
   the cover box and nothing is saved.
7. **Replace**: edit an entry with a cover, pick a different one, save → new image shows; the old file is
   gone from Storage (Supabase → Storage → entry-images → your folder).
8. **Delete** an entry with a cover → its file disappears from Storage. Deleting a whole collection does the same.
9. **Provider off**: in a collection's settings set Metadata lookup to None → the Find/Search buttons vanish.
   Set a blank collection to TMDB — movies → they appear.
10. **Errors**: with the network off, search shows "search failed, try again" rather than hanging.
11. **Isolation**: a signed URL copied from one account does not work after it expires (1 h), and another
    account never sees the file.
