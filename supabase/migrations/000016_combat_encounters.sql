create table if not exists public.combat_encounters (
  id uuid primary key default gen_random_uuid(),
  game_table_id uuid references public.game_tables(id) on delete cascade,
  name text not null,
  system text,
  round integer not null default 1,
  turn_index integer not null default 0,
  status text not null default 'draft',
  combatants jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists combat_encounters_game_table_id_idx
  on public.combat_encounters (game_table_id);

create index if not exists combat_encounters_status_idx
  on public.combat_encounters (status);

alter table public.combat_encounters enable row level security;

drop policy if exists "Table members read combat encounters" on public.combat_encounters;
create policy "Table members read combat encounters"
on public.combat_encounters for select
to authenticated
using (
  game_table_id is null
  or public.is_game_table_member(game_table_id)
);

drop policy if exists "Players read active combat encounters" on public.combat_encounters;
create policy "Players read active combat encounters"
on public.combat_encounters for select
to authenticated
using (
  status in ('active', 'completed')
  and (
    game_table_id is null
    or public.is_game_table_member(game_table_id)
  )
);

drop policy if exists "GMs manage combat encounters" on public.combat_encounters;
create policy "GMs manage combat encounters"
on public.combat_encounters for all
to authenticated
using (
  game_table_id is null
  or public.is_game_table_gm(game_table_id)
)
with check (
  game_table_id is null
  or public.is_game_table_gm(game_table_id)
);

drop trigger if exists set_combat_encounters_updated_at on public.combat_encounters;
create trigger set_combat_encounters_updated_at
before update on public.combat_encounters
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.combat_encounters to authenticated;
