-- Public share links: time-limited, read-only access to one collection without login.
-- The raw token never reaches the database; only its SHA-256 (hex) is stored.

create table if not exists public.collection_shares (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references public.collections(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  token_hash     text not null unique,
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.collection_shares enable row level security;

-- Owners manage their own links. Nobody else gets a policy: anonymous readers go through the function below.
drop policy if exists "shares_owner_select" on public.collection_shares;
create policy "shares_owner_select" on public.collection_shares
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "shares_owner_insert" on public.collection_shares;
create policy "shares_owner_insert" on public.collection_shares
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid()))
  );

drop policy if exists "shares_owner_update" on public.collection_shares;
create policy "shares_owner_update" on public.collection_shares
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "shares_owner_delete" on public.collection_shares;
create policy "shares_owner_delete" on public.collection_shares
  for delete to authenticated using (user_id = (select auth.uid()));

create index if not exists collection_shares_collection_idx on public.collection_shares (collection_id, expires_at desc);

-- ---------------------------------------------------------------------------
-- The only anonymous read path. Security definer so it can bypass RLS, with the
-- checks spelled out: hash matches, not revoked, not expired. Returns null otherwise.
-- user_id columns are stripped; entries are capped.
-- ---------------------------------------------------------------------------
create or replace function public.shared_collection(p_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'share', jsonb_build_object('id', s.id, 'expires_at', s.expires_at),
    'collection', to_jsonb(c) - 'user_id',
    'fields', (
      select coalesce(jsonb_agg(to_jsonb(f) - 'user_id' order by f.sort_order, f.created_at), '[]'::jsonb)
      from public.collection_fields f where f.collection_id = c.id
    ),
    'entries', (
      select coalesce(jsonb_agg(to_jsonb(e) - 'user_id' order by e.updated_at desc), '[]'::jsonb)
      from (
        select * from public.entries e where e.collection_id = c.id order by e.updated_at desc limit 2000
      ) e
    )
  )
  from public.collection_shares s
  join public.collections c on c.id = s.collection_id
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;
$$;

revoke all on function public.shared_collection(text) from public;
grant execute on function public.shared_collection(text) to anon, authenticated;

-- Covers of a currently shared collection may be signed by anonymous readers.
-- Security definer helper because the storage policy's subquery would otherwise hit RLS on entries.
create or replace function public.is_shared_cover(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entries e
    join public.collection_shares s on s.collection_id = e.collection_id
    where e.cover_image_path = p_name
      and s.revoked_at is null
      and s.expires_at > now()
  );
$$;

revoke all on function public.is_shared_cover(text) from public;
grant execute on function public.is_shared_cover(text) to anon, authenticated;

drop policy if exists "entry_images_shared_select" on storage.objects;
create policy "entry_images_shared_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'entry-images' and public.is_shared_cover(name));
