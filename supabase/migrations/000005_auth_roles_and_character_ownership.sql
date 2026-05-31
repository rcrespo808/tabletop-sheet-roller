-- Supabase Auth foundation: app profiles, table roles, and owned characters.

do $$
begin
  create type public.user_level as enum ('player', 'gm');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.character_kind as enum ('player_character', 'gm_character');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.app_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  user_level public.user_level not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_user_profiles enable row level security;

drop policy if exists "Users read own app profile" on public.app_user_profiles;
create policy "Users read own app profile"
on public.app_user_profiles for select
using (id = auth.uid());

drop policy if exists "Users create own app profile" on public.app_user_profiles;
create policy "Users create own app profile"
on public.app_user_profiles for insert
with check (id = auth.uid());

drop policy if exists "Users update own app profile" on public.app_user_profiles;
create policy "Users update own app profile"
on public.app_user_profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop trigger if exists set_app_user_profiles_updated_at on public.app_user_profiles;
create trigger set_app_user_profiles_updated_at
before update on public.app_user_profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_level public.user_level;
begin
  requested_level :=
    case
      when new.raw_user_meta_data ->> 'user_level' in ('player', 'gm')
        then (new.raw_user_meta_data ->> 'user_level')::public.user_level
      else 'player'::public.user_level
    end;

  insert into public.app_user_profiles (id, email, display_name, user_level)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    requested_level
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.app_user_profiles.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create table if not exists public.game_tables (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_table_members (
  table_id uuid not null references public.game_tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_level public.user_level not null default 'player',
  joined_at timestamptz not null default now(),
  primary key (table_id, user_id)
);

alter table public.game_tables enable row level security;
alter table public.game_table_members enable row level security;

create or replace function public.is_game_table_owner(_table_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.game_tables tables
    where tables.id = _table_id
      and tables.owner_user_id = auth.uid()
  );
$$;

create or replace function public.is_game_table_member(_table_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_game_table_owner(_table_id)
    or exists (
      select 1
      from public.game_table_members members
      where members.table_id = _table_id
        and members.user_id = auth.uid()
    );
$$;

drop policy if exists "Table members read tables" on public.game_tables;
create policy "Table members read tables"
on public.game_tables for select
using (public.is_game_table_member(id));

drop policy if exists "GMs create owned tables" on public.game_tables;
create policy "GMs create owned tables"
on public.game_tables for insert
with check (owner_user_id = auth.uid());

drop policy if exists "Owners update tables" on public.game_tables;
create policy "Owners update tables"
on public.game_tables for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Owners delete tables" on public.game_tables;
create policy "Owners delete tables"
on public.game_tables for delete
using (owner_user_id = auth.uid());

drop policy if exists "Users read table memberships" on public.game_table_members;
create policy "Users read table memberships"
on public.game_table_members for select
using (user_id = auth.uid() or public.is_game_table_owner(table_id));

drop policy if exists "Owners manage table memberships" on public.game_table_members;
create policy "Owners manage table memberships"
on public.game_table_members for all
using (public.is_game_table_owner(table_id))
with check (public.is_game_table_owner(table_id));

drop trigger if exists set_game_tables_updated_at on public.game_tables;
create trigger set_game_tables_updated_at
before update on public.game_tables
for each row
execute function public.set_updated_at();

alter table public.character_profiles
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  add column if not exists character_kind public.character_kind not null default 'player_character',
  add column if not exists game_table_id uuid references public.game_tables(id) on delete set null;

create index if not exists character_profiles_owner_user_id_idx
  on public.character_profiles (owner_user_id);

create index if not exists character_profiles_game_table_id_idx
  on public.character_profiles (game_table_id);

drop policy if exists "Public read character profiles" on public.character_profiles;
drop policy if exists "Public insert character profiles" on public.character_profiles;
drop policy if exists "Public update character profiles" on public.character_profiles;
drop policy if exists "Public delete character profiles" on public.character_profiles;

drop policy if exists "Users read own and legacy character profiles" on public.character_profiles;
create policy "Users read own and legacy character profiles"
on public.character_profiles for select
using (
  owner_user_id is null
  or owner_user_id = auth.uid()
);

drop policy if exists "Users create own character profiles" on public.character_profiles;
create policy "Users create own character profiles"
on public.character_profiles for insert
with check (owner_user_id = auth.uid());

drop policy if exists "Users update own character profiles" on public.character_profiles;
create policy "Users update own character profiles"
on public.character_profiles for update
using (owner_user_id is null or owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Users delete own character profiles" on public.character_profiles;
create policy "Users delete own character profiles"
on public.character_profiles for delete
using (owner_user_id = auth.uid());

alter table public.character_image_assets
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null default auth.uid();

create index if not exists character_image_assets_owner_user_id_idx
  on public.character_image_assets (owner_user_id);

alter table public.roll_logs
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  add column if not exists game_table_id uuid references public.game_tables(id) on delete set null;

create index if not exists roll_logs_actor_user_id_idx
  on public.roll_logs (actor_user_id);

create index if not exists roll_logs_game_table_id_created_at_idx
  on public.roll_logs (game_table_id, created_at desc);
