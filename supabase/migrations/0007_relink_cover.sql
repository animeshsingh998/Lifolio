-- Housekeeping: swap an entry's cover path (e.g. after re-encoding the image) without
-- logging an "Updated" activity or bumping updated_at. Security invoker: RLS still applies.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('lifolio.keep_updated_at', true) = 'on' then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.relink_cover(p_entry_id uuid, p_from text, p_to text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  perform set_config('lifolio.skip_activity', 'on', true);
  perform set_config('lifolio.keep_updated_at', 'on', true);
  update public.entries
     set cover_image_path = p_to
   where id = p_entry_id
     and cover_image_path = p_from
     and user_id = (select auth.uid());
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.relink_cover(uuid, text, text) from public;
grant execute on function public.relink_cover(uuid, text, text) to authenticated;
