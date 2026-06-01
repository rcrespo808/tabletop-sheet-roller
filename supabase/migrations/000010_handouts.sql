-- Campaign handouts with DB-enforced visibility and separate GM-only notes.

create table if not exists public.handouts (
  id uuid primary key default gen_random_uuid(),
  game_table_id uuid not null references public.game_tables(id) on delete cascade,
  title text not null,
  subtitle text,
  body text,
  image_url text,
  attachment_url text,
  visibility text not null default 'gm_only'
    check (visibility in ('gm_only', 'selected_players', 'campaign', 'public')),
  selected_player_ids uuid[] not null default '{}',
  tags text[] not null default '{}',
  reward_payloads jsonb not null default '[]'::jsonb,
  codex_entry_ids uuid[] not null default '{}',
  revealed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.handout_gm_notes (
  handout_id uuid primary key references public.handouts(id) on delete cascade,
  gm_notes text not null,
  updated_at timestamptz not null default now()
);

create index if not exists handouts_game_table_id_idx
  on public.handouts(game_table_id);

create index if not exists handouts_visibility_idx
  on public.handouts(visibility);

create index if not exists handouts_tags_idx
  on public.handouts using gin(tags);

create index if not exists handouts_selected_player_ids_idx
  on public.handouts using gin(selected_player_ids);

alter table public.handouts enable row level security;
alter table public.handout_gm_notes enable row level security;

drop policy if exists "Handouts read visible rows" on public.handouts;
create policy "Handouts read visible rows"
on public.handouts for select
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

drop policy if exists "Handouts GMs create" on public.handouts;
create policy "Handouts GMs create"
on public.handouts for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop policy if exists "Handouts GMs update" on public.handouts;
create policy "Handouts GMs update"
on public.handouts for update
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

drop policy if exists "Handouts GMs delete" on public.handouts;
create policy "Handouts GMs delete"
on public.handouts for delete
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop policy if exists "Handout GM notes read by GMs" on public.handout_gm_notes;
create policy "Handout GM notes read by GMs"
on public.handout_gm_notes for select
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = handout_id
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
);

drop policy if exists "Handout GM notes managed by GMs" on public.handout_gm_notes;
create policy "Handout GM notes managed by GMs"
on public.handout_gm_notes for all
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = handout_id
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.handouts handouts
    where handouts.id = handout_id
      and (
        public.is_app_gm()
        or public.is_game_table_gm(handouts.game_table_id)
      )
  )
);

drop trigger if exists set_handouts_updated_at on public.handouts;
create trigger set_handouts_updated_at
before update on public.handouts
for each row
execute function public.set_updated_at();

drop trigger if exists set_handout_gm_notes_updated_at on public.handout_gm_notes;
create trigger set_handout_gm_notes_updated_at
before update on public.handout_gm_notes
for each row
execute function public.set_updated_at();
