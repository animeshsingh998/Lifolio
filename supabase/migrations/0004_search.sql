-- Phase 3.3: browsing — trigram index for title search and a tag-count helper.

create extension if not exists pg_trgm with schema extensions;

-- Speeds up `title ilike '%...%'` (per-collection search and the global search box).
create index if not exists entries_title_trgm_idx
  on public.entries using gin (title extensions.gin_trgm_ops);

-- Distinct tags of a collection with usage counts, for the tag filter.
-- Security invoker: RLS on entries limits the result to the caller's rows.
create or replace function public.collection_tag_counts(p_collection_id uuid)
returns table (tag text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.tag, count(*)::bigint as count
  from public.entries e
  cross join lateral unnest(e.tags) as t(tag)
  where e.collection_id = p_collection_id
  group by t.tag
  order by count(*) desc, t.tag asc
  limit 200;
$$;

revoke all on function public.collection_tag_counts(uuid) from public;
grant execute on function public.collection_tag_counts(uuid) to authenticated;
