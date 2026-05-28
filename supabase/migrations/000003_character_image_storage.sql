-- Character image storage (Supabase Storage + metadata table)
-- WARNING: Storage policies below are permissive for MVP/demo use only.
-- Tighten auth + path ownership before any public release.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-images',
  'character-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read character images" on storage.objects;
create policy "Public read character images"
on storage.objects for select
using (bucket_id = 'character-images');

drop policy if exists "Public upload character images" on storage.objects;
create policy "Public upload character images"
on storage.objects for insert
with check (bucket_id = 'character-images');

drop policy if exists "Public update character images" on storage.objects;
create policy "Public update character images"
on storage.objects for update
using (bucket_id = 'character-images')
with check (bucket_id = 'character-images');

drop policy if exists "Public delete character images" on storage.objects;
create policy "Public delete character images"
on storage.objects for delete
using (bucket_id = 'character-images');

create table if not exists public.character_image_assets (
  id uuid primary key default gen_random_uuid(),
  character_id text not null references public.character_profiles(id) on delete cascade,
  image_kind text not null check (image_kind in ('portrait', 'sheet')),
  game_system text check (game_system in ('dnd5e', 'nwod')),
  storage_bucket text not null default 'character-images',
  storage_path text not null unique,
  public_url text not null,
  mime_type text,
  byte_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint character_image_assets_kind_system_check check (
    (image_kind = 'portrait' and game_system is null)
    or (image_kind = 'sheet' and game_system is not null)
  )
);

create unique index if not exists character_image_assets_portrait_unique
  on public.character_image_assets (character_id)
  where image_kind = 'portrait';

create unique index if not exists character_image_assets_sheet_unique
  on public.character_image_assets (character_id, game_system)
  where image_kind = 'sheet';

alter table public.character_image_assets enable row level security;

drop policy if exists "Public read character image assets" on public.character_image_assets;
create policy "Public read character image assets"
on public.character_image_assets for select
using (true);

drop policy if exists "Public insert character image assets" on public.character_image_assets;
create policy "Public insert character image assets"
on public.character_image_assets for insert
with check (true);

drop policy if exists "Public update character image assets" on public.character_image_assets;
create policy "Public update character image assets"
on public.character_image_assets for update
using (true)
with check (true);

drop policy if exists "Public delete character image assets" on public.character_image_assets;
create policy "Public delete character image assets"
on public.character_image_assets for delete
using (true);

drop trigger if exists set_character_image_assets_updated_at on public.character_image_assets;

create trigger set_character_image_assets_updated_at
before update on public.character_image_assets
for each row
execute function public.set_updated_at();
