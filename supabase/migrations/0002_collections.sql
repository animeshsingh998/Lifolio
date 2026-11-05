-- Phase 2: collections, custom field definitions, entries and the activity log.
-- Run in the Supabase SQL editor (or `supabase db push` once the CLI is set up).
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- collections: a user-defined "thing I track"
-- ---------------------------------------------------------------------------
create table if not exists public.collections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description     text check (char_length(description) <= 300),
  icon            text not null default 'folder',
  item_noun       text not null default 'item' check (char_length(item_noun) between 1 and 30),
  default_layout  text not null default 'grid' check (default_layout in ('grid', 'list')),
  status_options  jsonb not null default '[]'::jsonb,   -- [{key,label,kind}] kind ∈ planned|active|done|none
  date_label      text check (char_length(date_label) <= 40),  -- null hides the date field
  show_rating     boolean not null default true,
  lookup_provider text,                                  -- 'tmdb_movie' | 'tmdb_tv' | 'google_books' | null
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.collections enable row level security;

drop policy if exists "collections_owner_all" on public.collections;
create policy "collections_owner_all" on public.collections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create index if not exists collections_user_sort_idx on public.collections (user_id, sort_order, created_at);

-- ---------------------------------------------------------------------------
-- collection_fields: custom field definitions; `key` is the JSONB key in entries.attributes
-- ---------------------------------------------------------------------------
create table if not exists public.collection_fields (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references public.collections(id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key            text not null check (key ~ '^f_[a-z0-9_]{1,40}$'),
  label          text not null check (char_length(label) between 1 and 60),
  type           text not null check (type in ('text', 'textarea', 'number', 'date', 'select', 'url', 'checkbox', 'image')),
  options        jsonb not null default '{}'::jsonb,   -- select: {choices:[...]}, number: {min,max,step,unit}
  required       boolean not null default false,
  show_in_card   boolean not null default false,
  lookup_key     text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  unique (collection_id, key)
);

alter table public.collection_fields enable row level security;

drop policy if exists "collection_fields_owner_all" on public.collection_fields;
create policy "collection_fields_owner_all" on public.collection_fields
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists collection_fields_collection_idx on public.collection_fields (collection_id, sort_order);

-- ---------------------------------------------------------------------------
-- entries: one row per movie / book / watch / shoe …
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id                uuid primary key default gen_random_uuid(),
  collection_id     uuid not null references public.collections(id) on delete cascade,
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 200),
  status            text,
  rating            smallint check (rating between 0 and 10),
  occurred_on       date,
  notes             text check (char_length(notes) <= 10000),
  cover_image_path  text,
  image_source      text check (image_source in ('upload', 'url', 'provider')),
  external_provider text,
  external_id       text,
  tags              text[] not null default '{}',
  is_favorite       boolean not null default false,
  attributes        jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.entries enable row level security;

drop policy if exists "entries_owner_all" on public.entries;
create policy "entries_owner_all" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

create index if not exists entries_user_collection_updated_idx on public.entries (user_id, collection_id, updated_at desc);
create index if not exists entries_user_occurred_idx on public.entries (user_id, occurred_on desc);
create index if not exists entries_tags_idx on public.entries using gin (tags);

-- ---------------------------------------------------------------------------
-- activity_log: feeds Dashboard "recent activity". Written only by triggers.
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  collection_id  uuid references public.collections(id) on delete set null,
  entry_id       uuid references public.entries(id) on delete set null,
  action         text not null check (action in (
                   'collection_created', 'collection_deleted',
                   'entry_created', 'entry_updated', 'status_changed', 'entry_deleted')),
  summary        text not null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.activity_log enable row level security;

-- Users can read (and prune) their own history; inserts come from the security-definer triggers below.
drop policy if exists "activity_log_owner_select" on public.activity_log;
create policy "activity_log_owner_select" on public.activity_log
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "activity_log_owner_delete" on public.activity_log;
create policy "activity_log_owner_delete" on public.activity_log
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index if not exists activity_log_user_created_idx on public.activity_log (user_id, created_at desc);

-- Label of a status key inside a collection's status_options, falling back to the key.
create or replace function public.status_label(p_collection_id uuid, p_status text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select opt->>'label'
       from public.collections c, jsonb_array_elements(c.status_options) opt
      where c.id = p_collection_id and opt->>'key' = p_status
      limit 1),
    p_status);
$$;

create or replace function public.log_entry_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection_name text;
begin
  select name into v_collection_name from public.collections where id = coalesce(new.collection_id, old.collection_id);

  -- Parent collection is being deleted (cascade): skip per-entry noise.
  if v_collection_name is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    insert into public.activity_log (user_id, collection_id, entry_id, action, summary, metadata)
    values (new.user_id, new.collection_id, new.id, 'entry_created',
            format('Added "%s" to %s', new.title, v_collection_name),
            jsonb_build_object('title', new.title, 'status', new.status));

  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity_log (user_id, collection_id, entry_id, action, summary, metadata)
      values (new.user_id, new.collection_id, new.id, 'status_changed',
              format('"%s" → %s', new.title, coalesce(public.status_label(new.collection_id, new.status), 'no status')),
              jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
    else
      insert into public.activity_log (user_id, collection_id, entry_id, action, summary, metadata)
      values (new.user_id, new.collection_id, new.id, 'entry_updated',
              format('Updated "%s"', new.title),
              jsonb_build_object('title', new.title));
    end if;

  elsif tg_op = 'DELETE' then
    -- Account deletion cascades here too; the user row is already gone, so nothing to log.
    if not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;
    insert into public.activity_log (user_id, collection_id, entry_id, action, summary, metadata)
    values (old.user_id, old.collection_id, null, 'entry_deleted',
            format('Removed "%s" from %s', old.title, v_collection_name),
            jsonb_build_object('title', old.title));
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists entries_log_activity on public.entries;
create trigger entries_log_activity
  after insert or update or delete on public.entries
  for each row execute function public.log_entry_activity();

create or replace function public.log_collection_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (user_id, collection_id, action, summary, metadata)
    values (new.user_id, new.id, 'collection_created',
            format('Created collection %s', new.name),
            jsonb_build_object('name', new.name));
    return new;
  else
    if not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;
    insert into public.activity_log (user_id, collection_id, action, summary, metadata)
    values (old.user_id, null, 'collection_deleted',
            format('Deleted collection %s', old.name),
            jsonb_build_object('name', old.name));
    return old;
  end if;
end;
$$;

drop trigger if exists collections_log_activity on public.collections;
create trigger collections_log_activity
  after insert or delete on public.collections
  for each row execute function public.log_collection_activity();
