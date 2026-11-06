-- Phase 4.1: dashboard statistics, one row per collection the caller owns.
-- Security invoker: RLS on entries scopes the aggregate to the current user.

create or replace function public.collection_stats()
returns table (
  collection_id uuid,
  total         bigint,
  favourites    bigint,
  added_30d     bigint,
  avg_rating    numeric,
  status_counts jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with per_status as (
    select e.collection_id, coalesce(e.status, '') as status, count(*)::bigint as n
    from public.entries e
    group by e.collection_id, e.status
  )
  select
    e.collection_id,
    count(*)::bigint                                                            as total,
    count(*) filter (where e.is_favorite)::bigint                               as favourites,
    count(*) filter (where e.created_at >= now() - interval '30 days')::bigint  as added_30d,
    round(avg(e.rating)::numeric, 1)                                            as avg_rating,
    coalesce(
      (select jsonb_object_agg(p.status, p.n) from per_status p where p.collection_id = e.collection_id),
      '{}'::jsonb
    )                                                                           as status_counts
  from public.entries e
  group by e.collection_id;
$$;

revoke all on function public.collection_stats() from public, anon;
grant execute on function public.collection_stats() to authenticated;
