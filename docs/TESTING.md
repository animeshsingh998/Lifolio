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

## Phase 3.2 — Bulk import

1. On a collection page click the **JSON** icon (next to the gear) → import page. Click **Use example**,
   check the summary says "2 items recognised", pick ratings scale 5 and default status Watched.
2. **Find matches** → progress, then the review list: each row shows your title, a poster, the matched
   title with year in a dropdown, and a "check" badge on doubtful matches. Change one row to its second
   candidate; untick one row.
3. **Import** → progress bar → summary with links to the created entries. Open one: cover, year, director filled;
   rating converted (4 → 4 stars, 4.5 → 4½); status Watched.
4. Run the same list again → both rows show **exists** and are unticked by default.
5. Paste a list with a typo title ("Arrivle") → "no match" badge; with the "create unmatched" box ticked it is
   created as a plain entry, with it unticked it is skipped.
6. Books: a list with `{"title":"Dune","year":1965}` and an ISBN-only item → both match.
7. Watches (no provider): `[{"title":"Submariner","Brand":"Rolex","rating":5}]` → review shows no search,
   import fills the Brand field. Leaving Brand out → row fails with "Brand is required" (it is a required field).
8. Paste 60 items → batches run without errors; **Stop** mid-way leaves the already-created ones in place.
9. Bad input: `{"a":1}` and `[1,2]` show clear messages and the button stays disabled.

## Phase 3.3 — Filters, sorting & global search

Migration 0004 is already applied (tag counts + title index).

1. **Filter bar**: open Movies. Above the grid: search box, Status, Rating, Genre (any select field),
   Tags (only if some entries have tags), Favourites, and a Sort button on the right. The count line reads
   "1–N of N movies".
2. **Search**: type part of a title → list narrows after a short pause and the URL gains `?q=…`. A word that
   only appears in an entry's notes or tags also matches. Clear the box → everything is back.
3. **Status**: tick Watched → only watched; tick a second status → both (OR). The button shows a count badge.
4. **Rating**: pick "4+ stars" → only entries rated 4 or more; the button shows "Rating · 4+ stars".
5. **Select field + tags + favourites**: combine Genre = Drama with a tag and the heart button → filters are
   ANDed; "Clear" appears and removes all of them but keeps the sort.
6. **Sort**: Title A–Z, Highest rated (unrated entries go last), "Watched on: newest". Sort persists while you
   change other filters.
7. **Shareable**: copy the URL with filters, open it in a new tab → same view. Browser back/forward restores
   previous filter states and the search box text follows.
8. **No matches**: filter to something impossible → "Nothing matches these filters" with a Clear filters button.
   A collection with zero entries still shows the original "No movies yet" state.
9. **Pagination**: a collection with more than 60 entries shows "1–60 of N", Prev/Next and a page counter at the
   top and bottom; page 2 keeps the filters; `?page=99` shows "Nothing on this page" with a way back.
10. **Grid/list toggle** still works and still persists per collection.
11. **Global search**: press **Ctrl K** (⌘ K on Mac) anywhere → palette with "Jump to" collections. Type two or
    more letters → matching collections and up to 12 entries with thumbnails and status; arrow keys + Enter
    open the entry; Esc closes and clears. "See all results" opens `/search?q=…` grouped by collection, each
    group with an "Open in collection" link that applies the search there.
12. The sidebar has a **Search** item (shows "Ctrl K") and the mobile header a search icon; both open the palette.
13. **Isolation**: searching for an entry title that exists only in another account returns nothing.

## Phase 4.1 — Dashboard

Migration 0005 is already applied.

1. Open **Dashboard**. Four tiles: Entries, Collections, Added in 30 days, Favourites. Numbers match the
   sidebar counts (entries = sum of all collections).
2. **Currently tracking** shows entries whose status is an "in progress" kind (Watching, Reading, Wearing…),
   newest first, max 8. Change an entry to Watching → it appears; mark it Watched → it leaves.
3. **Recently added** shows the last 8 entries across all collections with covers; a fresh import shows up first.
4. **Collections** cards: icon, name, count, "+N this month" when something was added in the last 30 days,
   average star rating (only if the collection shows ratings), favourites count, and a slim bar split into
   done / active / planned with a legend. Clicking a card opens the collection.
5. **Recent activity** lists the last 15 changes ("Added …", "… → Watched", "Updated …", "Deleted …",
   "Created collection …") with relative times ("3 h ago"). Rows whose entry still exists link to it; deleted
   ones are plain text.
6. **Empty states**: a brand-new account sees "Nothing here yet"; an account with collections but no entries
   sees tiles at 0 plus Add / Import JSON buttons.
7. **Mobile**: tiles 2×2, strips 2 per row, collections above the activity feed.

## Quick actions (2026-11-07)

1. Sidebar **Quick add** (red plus) → dialog with your collections → pick one → its "Add …" form opens. With the
   sidebar collapsed the button still works and shows a tooltip.
2. On a collection page (grid and list), click the **status chip** on an entry → menu with the collection's statuses
   and "No status". Pick one → chip updates at once; reload → still changed; the dashboard activity feed shows
   "… → Watched". The card itself still opens the entry when you click anywhere else.
3. Hover the **stars** on a card or row → they turn into a picker; click a half or full star → saved immediately;
   click the same value again → rating cleared. Collections with ratings turned off show no stars.
4. A card field holding a year (Release year, Published) shows "2003", not "2,003"; a number with a unit still
   shows the unit ("148 min").
5. Keyboard: Tab reaches the card link, the status chip and the stars in turn; Enter opens the menu / sets a rating.
6. Hover a card → a small pencil appears top-left (on a row: far right) → opens the edit page directly. On a phone it is always visible.

## Share links (2026-11-07)

Migration 0006 is already applied.

1. On a collection page click the **share** icon (left of the JSON icon) → dialog. Pick "1 hour", **Create link** →
   a link appears with a copy button; the note says it is shown only once. Copy it.
2. Open the link in a **private/incognito window** (no login): the collection shows with a "Shared view" badge, the
   expiry ("Link expires in 1 h"), the grid/list toggle, the filter bar, sort and pagination. No Add button, no
   pencil, no status/rating controls; covers load. Click an entry → read-only detail page; back link returns to the
   shared list.
3. In the private window try `/collections` and `/dashboard` → redirected to login as before.
4. Change a filter in the private window → URL updates, list narrows; the grid/list toggle works but is not saved.
5. Back in your account: the dialog lists the link under **Active links**; click **Revoke** → reload the private
   window → "This link is no longer available".
6. Create a 7-day link, then another → both listed. Change one character of the token in the URL → unavailable page,
   no error screen.
7. Share a collection with zero entries → "This collection has no entries", no Add button.
8. Isolation: the shared page never shows other collections, your email, or any way to edit; deleting the collection
   makes its links unavailable.

## Polish (2026-11-08)

1. Phone width: the dashboard has no horizontal scroll; tiles, strips, collection cards and the activity feed all stay
   inside the screen. Same for a collection page with many filters.
2. Ctrl K → type a title → each result has a small pencil on the right; clicking it opens the edit page (clicking the
   row still opens the detail page). The /search page cards show the pencil on hover as elsewhere.
3. A movie with a white or very light poster: the status chip at the bottom-left of the cover is readable in both
   themes (opaque backdrop, coloured text and border). The chip still opens the status menu.
4. Every page ends with the footer line "© 2026 Lifolio · This website is managed and owned by Animesh." —
   app pages, the login page and a shared link page.
