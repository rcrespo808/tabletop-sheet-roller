-- Reusable loot tables with weighted rewards.

create table if not exists public.loot_tables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.game_tables(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'gm_only' check (visibility in ('gm_only', 'campaign')),
  entries jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loot_tables_campaign_id_idx
  on public.loot_tables(campaign_id);

create index if not exists loot_tables_visibility_idx
  on public.loot_tables(visibility);

alter table public.loot_tables enable row level security;

drop policy if exists "Loot tables read visible entries" on public.loot_tables;
create policy "Loot tables read visible entries"
on public.loot_tables for select
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(campaign_id)
    or (
      visibility = 'campaign'
      and public.is_game_table_member(campaign_id)
    )
  )
);

drop policy if exists "Loot tables GMs create" on public.loot_tables;
create policy "Loot tables GMs create"
on public.loot_tables for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and (
    public.is_app_gm()
    or public.is_game_table_gm(campaign_id)
  )
);

drop policy if exists "Loot tables GMs update" on public.loot_tables;
create policy "Loot tables GMs update"
on public.loot_tables for update
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(campaign_id)
  )
)
with check (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(campaign_id)
  )
);

drop policy if exists "Loot tables GMs delete" on public.loot_tables;
create policy "Loot tables GMs delete"
on public.loot_tables for delete
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(campaign_id)
  )
);

drop trigger if exists set_loot_tables_updated_at on public.loot_tables;
create trigger set_loot_tables_updated_at
before update on public.loot_tables
for each row
execute function public.set_updated_at();
