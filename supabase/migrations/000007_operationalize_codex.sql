-- Operational codex support for grants, prerequisites, source labels, and tighter visibility.

alter table public.codex_entries
  add column if not exists grants jsonb not null default '[]'::jsonb,
  add column if not exists prerequisites jsonb not null default '[]'::jsonb,
  add column if not exists source_label text;

alter table public.codex_entries
  drop constraint if exists codex_entries_type_check;

alter table public.codex_entries
  add constraint codex_entries_type_check
  check (
    type in (
      'ability',
      'spell',
      'power',
      'feat',
      'merit',
      'rite',
      'condition',
      'disease',
      'curse',
      'blessing',
      'item',
      'loot',
      'note'
    )
  );

create index if not exists codex_entries_campaign_id_idx
  on public.codex_entries(campaign_id);

create index if not exists codex_entries_system_idx
  on public.codex_entries(system);

create index if not exists codex_entries_type_idx
  on public.codex_entries(type);

create index if not exists codex_entries_tags_idx
  on public.codex_entries using gin(tags);

alter table public.codex_entries enable row level security;

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
        public.is_app_gm()
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
    public.is_app_gm()
    or (
      campaign_id is not null
      and public.is_game_table_gm(campaign_id)
    )
  )
)
with check (
  auth.uid() is not null
  and (
    public.is_app_gm()
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
    public.is_app_gm()
    or (
      campaign_id is not null
      and public.is_game_table_gm(campaign_id)
    )
  )
);

alter table public.character_profiles
  add column if not exists inventory jsonb not null default '[]'::jsonb;
