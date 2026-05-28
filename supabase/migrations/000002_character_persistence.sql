-- Character profile persistence (JSONB sheets model)
-- WARNING: RLS policies below are permissive for MVP/demo use only.
-- Tighten auth + row ownership before any public release.

create table if not exists public.character_profiles (
  id text primary key,
  owner_label text,
  name text not null,
  subtitle text,
  concept text,
  portrait_image text,
  default_system text not null check (default_system in ('dnd5e', 'nwod')),
  sheets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.character_profiles enable row level security;

drop policy if exists "Public read character profiles" on public.character_profiles;
create policy "Public read character profiles"
on public.character_profiles for select
using (true);

drop policy if exists "Public insert character profiles" on public.character_profiles;
create policy "Public insert character profiles"
on public.character_profiles for insert
with check (true);

drop policy if exists "Public update character profiles" on public.character_profiles;
create policy "Public update character profiles"
on public.character_profiles for update
using (true)
with check (true);

drop policy if exists "Public delete character profiles" on public.character_profiles;
create policy "Public delete character profiles"
on public.character_profiles for delete
using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_character_profiles_updated_at on public.character_profiles;

create trigger set_character_profiles_updated_at
before update on public.character_profiles
for each row
execute function public.set_updated_at();
