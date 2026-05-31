-- Ability codex foundation for reusable powers, spells, feats, items, and notes.

create table if not exists public.codex_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.game_tables(id) on delete cascade,
  system text not null check (system in ('dnd5e', 'nwod', 'generic')),
  type text not null check (type in ('ability', 'spell', 'power', 'feat', 'item', 'loot', 'note')),
  name text not null,
  subtitle text,
  description text not null,
  rules_text text,
  tags text[] not null default '{}',
  visibility text not null default 'campaign' check (visibility in ('gm_only', 'campaign', 'public')),
  action_template jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists codex_entries_campaign_id_idx
  on public.codex_entries (campaign_id);

create index if not exists codex_entries_system_type_idx
  on public.codex_entries (system, type);

create index if not exists codex_entries_tags_idx
  on public.codex_entries using gin (tags);

alter table public.codex_entries enable row level security;

create or replace function public.is_app_gm()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_user_profiles profiles
    where profiles.id = auth.uid()
      and profiles.user_level = 'gm'
  );
$$;

create or replace function public.is_game_table_gm(_table_id uuid)
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
        and members.user_level = 'gm'
    );
$$;

drop policy if exists "Codex read visible entries" on public.codex_entries;
create policy "Codex read visible entries"
on public.codex_entries for select
using (
  auth.uid() is not null
  and (
    visibility = 'public'
    or (
      visibility = 'campaign'
      and (
        campaign_id is null
        or public.is_game_table_member(campaign_id)
      )
    )
    or (
      visibility = 'gm_only'
      and (
        created_by = auth.uid()
        or public.is_app_gm()
        or (
          campaign_id is not null
          and public.is_game_table_gm(campaign_id)
        )
      )
    )
  )
);

drop policy if exists "Codex GMs create entries" on public.codex_entries;
create policy "Codex GMs create entries"
on public.codex_entries for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and (
    public.is_app_gm()
    or (
      campaign_id is not null
      and public.is_game_table_gm(campaign_id)
    )
  )
);

drop policy if exists "Codex GMs update entries" on public.codex_entries;
create policy "Codex GMs update entries"
on public.codex_entries for update
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.is_app_gm()
    or (
      campaign_id is not null
      and public.is_game_table_gm(campaign_id)
    )
  )
)
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.is_app_gm()
    or (
      campaign_id is not null
      and public.is_game_table_gm(campaign_id)
    )
  )
);

drop policy if exists "Codex GMs delete entries" on public.codex_entries;
create policy "Codex GMs delete entries"
on public.codex_entries for delete
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.is_app_gm()
    or (
      campaign_id is not null
      and public.is_game_table_gm(campaign_id)
    )
  )
);

drop trigger if exists set_codex_entries_updated_at on public.codex_entries;
create trigger set_codex_entries_updated_at
before update on public.codex_entries
for each row
execute function public.set_updated_at();
