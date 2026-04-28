-- ── Avatars storage bucket + RLS ─────────────────────────────────────────
-- Public-read bucket so the rendered <img src> works without signed URLs.
-- Each user can only write objects under their own /<user_id>/ prefix —
-- prevents one user from overwriting another's avatar.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies are defined on storage.objects so RLS can scope to the bucket
-- and the path. The pattern matches Supabase's documented convention:
--   path = "<user_id>/<filename>"   →   first folder must equal auth.uid().

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read is implicitly public via bucket.public = true; no select policy needed.
