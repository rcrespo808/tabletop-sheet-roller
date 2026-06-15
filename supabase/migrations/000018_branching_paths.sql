-- Branching paths: node-based campaign progression graphs.

create table if not exists public.branching_paths (
  id uuid primary key default gen_random_uuid(),
  game_table_id uuid not null references public.game_tables(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'archived')),
  visibility text not null default 'gm_only'
    check (visibility in ('gm_only', 'selected_players', 'campaign', 'public')),
  selected_player_ids uuid[] not null default '{}',
  current_node_ids text[] not null default '{}',
  start_node_id text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  gm_notes text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists branching_paths_game_table_id_idx
  on public.branching_paths(game_table_id);

create index if not exists branching_paths_status_idx
  on public.branching_paths(status);

create index if not exists branching_paths_visibility_idx
  on public.branching_paths(visibility);

create index if not exists branching_paths_tags_idx
  on public.branching_paths using gin(tags);

alter table public.branching_paths enable row level security;

grant select on public.branching_paths to anon;
grant select, insert, update, delete on public.branching_paths to authenticated;
grant select, insert, update, delete on public.branching_paths to service_role;

drop policy if exists "Branching paths read visible rows" on public.branching_paths;
create policy "Branching paths read visible rows"
on public.branching_paths for select
using (
  visibility = 'public'
  or (
    auth.uid() is not null
    and (
      public.is_app_gm()
      or public.is_game_table_gm(game_table_id)
      or (
        visibility = 'campaign'
        and public.is_game_table_member(game_table_id)
      )
      or (
        visibility = 'selected_players'
        and auth.uid() = any(selected_player_ids)
      )
    )
  )
);

drop policy if exists "Branching paths GMs create" on public.branching_paths;
create policy "Branching paths GMs create"
on public.branching_paths for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop policy if exists "Branching paths GMs update" on public.branching_paths;
create policy "Branching paths GMs update"
on public.branching_paths for update
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
)
with check (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop policy if exists "Branching paths GMs delete" on public.branching_paths;
create policy "Branching paths GMs delete"
on public.branching_paths for delete
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop trigger if exists set_branching_paths_updated_at on public.branching_paths;
create trigger set_branching_paths_updated_at
before update on public.branching_paths
for each row
execute function public.set_updated_at();
