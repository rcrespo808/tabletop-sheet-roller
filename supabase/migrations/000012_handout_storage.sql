-- Private Supabase Storage for handout images and attachments.

alter table public.handouts
  add column if not exists image_path text,
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size bigint;

create index if not exists handouts_image_path_idx
  on public.handouts(image_path)
  where image_path is not null;

create index if not exists handouts_attachment_path_idx
  on public.handouts(attachment_path)
  where attachment_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'handout-images',
    'handout-images',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  ),
  (
    'handout-attachments',
    'handout-attachments',
    false,
    10485760,
    array[
      'application/pdf',
      'application/json',
      'application/octet-stream',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.try_uuid(_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return _value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.handout_storage_game_table_id(_name text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid((string_to_array(_name, '/'))[1]);
$$;

create or replace function public.handout_storage_handout_id(_name text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid((string_to_array(_name, '/'))[2]);
$$;

drop policy if exists "Handout files read" on storage.objects;
create policy "Handout files read"
on storage.objects for select
using (
  bucket_id in ('handout-images', 'handout-attachments')
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = public.handout_storage_handout_id(name)
      and handouts.game_table_id = public.handout_storage_game_table_id(name)
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
        or (
          (handouts.image_path = bucket_id || '/' || name
            or handouts.attachment_path = bucket_id || '/' || name)
          and (
            handouts.visibility = 'public'
            or (
              handouts.visibility = 'campaign'
              and public.is_game_table_member(handouts.game_table_id)
            )
            or (
              handouts.visibility = 'selected_players'
              and auth.uid() = any(handouts.selected_player_ids)
            )
          )
        )
      )
  )
);

drop policy if exists "Handout files GMs upload" on storage.objects;
create policy "Handout files GMs upload"
on storage.objects for insert
with check (
  bucket_id in ('handout-images', 'handout-attachments')
  and auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = public.handout_storage_handout_id(name)
      and handouts.game_table_id = public.handout_storage_game_table_id(name)
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
);

drop policy if exists "Handout files GMs update" on storage.objects;
create policy "Handout files GMs update"
on storage.objects for update
using (
  bucket_id in ('handout-images', 'handout-attachments')
  and auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = public.handout_storage_handout_id(name)
      and handouts.game_table_id = public.handout_storage_game_table_id(name)
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
)
with check (
  bucket_id in ('handout-images', 'handout-attachments')
  and auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = public.handout_storage_handout_id(name)
      and handouts.game_table_id = public.handout_storage_game_table_id(name)
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
);

drop policy if exists "Handout files GMs delete" on storage.objects;
create policy "Handout files GMs delete"
on storage.objects for delete
using (
  bucket_id in ('handout-images', 'handout-attachments')
  and auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = public.handout_storage_handout_id(name)
      and handouts.game_table_id = public.handout_storage_game_table_id(name)
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
);
