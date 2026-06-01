-- Interactive handout categories and reward application audit records.

alter table public.handouts
  add column if not exists kind text not null default 'lore';

alter table public.handouts
  drop constraint if exists handouts_kind_check;

alter table public.handouts
  add constraint handouts_kind_check
  check (
    kind in (
      'lore',
      'wanted_poster',
      'spell_scroll',
      'treasure_note',
      'contract',
      'clue',
      'condition_notice',
      'faction_letter'
    )
  );

create index if not exists handouts_kind_idx
  on public.handouts(kind);

create table if not exists public.handout_reward_applications (
  id uuid primary key default gen_random_uuid(),
  handout_id uuid not null references public.handouts(id) on delete cascade,
  character_id text not null,
  game_table_id uuid not null references public.game_tables(id) on delete cascade,
  applied_by uuid references auth.users(id) on delete set null default auth.uid(),
  reward_summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists handout_reward_applications_handout_id_idx
  on public.handout_reward_applications(handout_id);

create index if not exists handout_reward_applications_game_table_id_idx
  on public.handout_reward_applications(game_table_id);

create index if not exists handout_reward_applications_character_id_idx
  on public.handout_reward_applications(character_id);

alter table public.handout_reward_applications enable row level security;

drop policy if exists "Handout reward applications read" on public.handout_reward_applications;
create policy "Handout reward applications read"
on public.handout_reward_applications for select
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
    or (
      exists (
        select 1
        from public.handouts handouts
        where handouts.id = handout_id
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
      and exists (
        select 1
        from public.character_profiles characters
        where characters.id = character_id
          and (
            characters.owner_user_id is null
            or characters.owner_user_id = auth.uid()
          )
      )
    )
  )
);

drop policy if exists "Handout reward applications GMs create" on public.handout_reward_applications;
create policy "Handout reward applications GMs create"
on public.handout_reward_applications for insert
with check (
  auth.uid() is not null
  and applied_by = auth.uid()
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop policy if exists "Handout reward applications GMs update" on public.handout_reward_applications;
create policy "Handout reward applications GMs update"
on public.handout_reward_applications for update
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

drop policy if exists "Handout reward applications GMs delete" on public.handout_reward_applications;
create policy "Handout reward applications GMs delete"
on public.handout_reward_applications for delete
using (
  auth.uid() is not null
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);
