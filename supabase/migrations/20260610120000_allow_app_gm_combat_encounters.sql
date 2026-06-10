drop policy if exists "Table members read combat encounters" on public.combat_encounters;
create policy "Table members read combat encounters"
on public.combat_encounters for select
to authenticated
using (
  public.is_app_gm()
  or game_table_id is null
  or public.is_game_table_member(game_table_id)
);

drop policy if exists "Players read active combat encounters" on public.combat_encounters;
create policy "Players read active combat encounters"
on public.combat_encounters for select
to authenticated
using (
  status in ('active', 'completed')
  and (
    public.is_app_gm()
    or game_table_id is null
    or public.is_game_table_member(game_table_id)
  )
);

drop policy if exists "GMs manage combat encounters" on public.combat_encounters;
create policy "GMs manage combat encounters"
on public.combat_encounters for all
to authenticated
using (
  public.is_app_gm()
  or game_table_id is null
  or public.is_game_table_gm(game_table_id)
)
with check (
  public.is_app_gm()
  or game_table_id is null
  or public.is_game_table_gm(game_table_id)
);
