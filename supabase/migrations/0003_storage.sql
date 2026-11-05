-- Phase 3: private bucket for entry cover images.
-- Object path: {user_id}/{uuid}.{ext}. The first folder must equal the caller's uid,
-- which is what every policy below checks. Files are served via short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-images',
  'entry-images',
  false,
  8388608, -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "entry_images_owner_select" on storage.objects;
create policy "entry_images_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'entry-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "entry_images_owner_insert" on storage.objects;
create policy "entry_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'entry-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "entry_images_owner_update" on storage.objects;
create policy "entry_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'entry-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'entry-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "entry_images_owner_delete" on storage.objects;
create policy "entry_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'entry-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
