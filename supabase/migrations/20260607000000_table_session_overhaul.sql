-- Table session overhaul: join codes, character assignments, roster RLS, RPCs.

-- ---------------------------------------------------------------------------
-- Join codes on game_tables
-- ---------------------------------------------------------------------------

alter table public.game_tables
  add column if not exists join_code text unique;

create or replace function public.generate_table_join_code()
returns text
language plpgsql
volatile
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  end loop;
  return result;
end;
$$;

update public.game_tables
set join_code = public.generate_table_join_code()
where join_code is null;

alter table public.game_tables
  alter column join_code set not null;

create or replace function public.ensure_game_table_join_code()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  if new.join_code is not null and btrim(new.join_code) <> '' then
    new.join_code := upper(btrim(new.join_code));
    return new;
  end if;

  loop
    candidate := public.generate_table_join_code();
    exit when not exists (
      select 1 from public.game_tables tables where tables.join_code = candidate
    );
    attempts := attempts + 1;
    if attempts > 25 then
      raise exception 'Could not generate unique join code';
    end if;
  end loop;

  new.join_code := candidate;
  return new;
end;
$$;

drop trigger if exists ensure_game_table_join_code on public.game_tables;
create trigger ensure_game_table_join_code
before insert on public.game_tables
for each row
execute function public.ensure_game_table_join_code();

-- ---------------------------------------------------------------------------
-- Character assignments (junction)
-- ---------------------------------------------------------------------------

create table if not exists public.game_table_character_assignments (
  table_id uuid not null references public.game_tables(id) on delete cascade,
  character_id text not null references public.character_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (table_id, character_id)
);

create index if not exists game_table_character_assignments_user_idx
  on public.game_table_character_assignments (table_id, user_id);

create index if not exists game_table_character_assignments_character_idx
  on public.game_table_character_assignments (character_id);

alter table public.game_table_character_assignments enable row level security;

grant select, insert, update, delete on public.game_table_character_assignments to authenticated;

drop policy if exists "Table members read character assignments" on public.game_table_character_assignments;
create policy "Table members read character assignments"
on public.game_table_character_assignments for select
to authenticated
using (public.is_game_table_member(table_id));

drop policy if exists "Table GMs manage character assignments" on public.game_table_character_assignments;
create policy "Table GMs manage character assignments"
on public.game_table_character_assignments for all
to authenticated
using (public.is_game_table_gm(table_id))
with check (public.is_game_table_gm(table_id));

-- ---------------------------------------------------------------------------
-- game_table_members policies
-- ---------------------------------------------------------------------------

drop policy if exists "Users read table memberships" on public.game_table_members;
create policy "Table members read full roster"
on public.game_table_members for select
to authenticated
using (public.is_game_table_member(table_id));

drop policy if exists "Owners manage table memberships" on public.game_table_members;
create policy "Table GMs manage memberships"
on public.game_table_members for insert
to authenticated
with check (public.is_game_table_gm(table_id));

drop policy if exists "Table GMs update memberships" on public.game_table_members;
create policy "Table GMs update memberships"
on public.game_table_members for update
to authenticated
using (public.is_game_table_gm(table_id))
with check (public.is_game_table_gm(table_id));

drop policy if exists "Table GMs delete memberships" on public.game_table_members;
create policy "Table GMs delete memberships"
on public.game_table_members for delete
to authenticated
using (public.is_game_table_gm(table_id));

-- ---------------------------------------------------------------------------
-- character_profiles visibility for table context
-- ---------------------------------------------------------------------------

drop policy if exists "Table members read campaign characters" on public.character_profiles;
create policy "Table members read campaign characters"
on public.character_profiles for select
to authenticated
using (
  game_table_id is not null
  and public.is_game_table_member(game_table_id)
);

drop policy if exists "Assigned players read assigned characters" on public.character_profiles;
create policy "Assigned players read assigned characters"
on public.character_profiles for select
to authenticated
using (
  exists (
    select 1
    from public.game_table_character_assignments assignments
    where assignments.character_id = character_profiles.id
      and assignments.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.join_game_table(p_join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_table_id uuid;
  v_normalized_code text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_normalized_code := upper(btrim(p_join_code));
  if v_normalized_code = '' then
    raise exception 'Join code is required';
  end if;

  select tables.id
  into v_table_id
  from public.game_tables tables
  where tables.join_code = v_normalized_code;

  if v_table_id is null then
    raise exception 'Invalid join code';
  end if;

  if public.is_game_table_owner(v_table_id) then
    return v_table_id;
  end if;

  insert into public.game_table_members (table_id, user_id, user_level)
  values (v_table_id, v_user_id, 'player')
  on conflict (table_id, user_id) do nothing;

  return v_table_id;
end;
$$;

revoke all on function public.join_game_table(text) from public;
grant execute on function public.join_game_table(text) to authenticated;

create or replace function public.leave_game_table(p_table_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_gm_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if public.is_game_table_owner(p_table_id) then
    raise exception 'Table owners cannot leave their own table';
  end if;

  if exists (
    select 1
    from public.game_table_members members
    where members.table_id = p_table_id
      and members.user_id = v_user_id
      and members.user_level = 'gm'
  ) then
    select count(*)::integer
    into v_gm_count
    from public.game_table_members members
    where members.table_id = p_table_id
      and members.user_level = 'gm';

    if v_gm_count <= 1 then
      raise exception 'Cannot leave as the only table GM';
    end if;
  end if;

  delete from public.game_table_character_assignments assignments
  where assignments.table_id = p_table_id
    and assignments.user_id = v_user_id;

  delete from public.game_table_members members
  where members.table_id = p_table_id
    and members.user_id = v_user_id;
end;
$$;

revoke all on function public.leave_game_table(uuid) from public;
grant execute on function public.leave_game_table(uuid) to authenticated;

create or replace function public.assign_table_character(
  p_table_id uuid,
  p_character_id text,
  p_user_id uuid
)
returns public.game_table_character_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.game_table_character_assignments;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_game_table_gm(p_table_id) then
    raise exception 'Only table GMs can assign characters';
  end if;

  if not exists (
    select 1
    from public.game_table_members members
    where members.table_id = p_table_id
      and members.user_id = p_user_id
  ) then
    raise exception 'Target user is not a table member';
  end if;

  if not exists (
    select 1
    from public.character_profiles characters
    where characters.id = p_character_id
      and characters.game_table_id = p_table_id
  ) then
    raise exception 'Character is not scoped to this table';
  end if;

  insert into public.game_table_character_assignments (
    table_id,
    character_id,
    user_id,
    assigned_by
  )
  values (p_table_id, p_character_id, p_user_id, v_actor)
  on conflict (table_id, character_id) do update
  set
    user_id = excluded.user_id,
    assigned_by = excluded.assigned_by,
    assigned_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.assign_table_character(uuid, text, uuid) from public;
grant execute on function public.assign_table_character(uuid, text, uuid) to authenticated;

create or replace function public.unassign_table_character(
  p_table_id uuid,
  p_character_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_game_table_gm(p_table_id) then
    raise exception 'Only table GMs can unassign characters';
  end if;

  delete from public.game_table_character_assignments assignments
  where assignments.table_id = p_table_id
    and assignments.character_id = p_character_id;
end;
$$;

revoke all on function public.unassign_table_character(uuid, text) from public;
grant execute on function public.unassign_table_character(uuid, text) to authenticated;

create or replace function public.regenerate_table_join_code(p_table_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_code text;
  v_attempts integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_game_table_gm(p_table_id) then
    raise exception 'Only table GMs can regenerate join codes';
  end if;

  loop
    v_code := public.generate_table_join_code();
    exit when not exists (
      select 1
      from public.game_tables tables
      where tables.join_code = v_code
        and tables.id <> p_table_id
    );
    v_attempts := v_attempts + 1;
    if v_attempts > 25 then
      raise exception 'Could not generate unique join code';
    end if;
  end loop;

  update public.game_tables tables
  set join_code = v_code,
      updated_at = now()
  where tables.id = p_table_id;

  return v_code;
end;
$$;

revoke all on function public.regenerate_table_join_code(uuid) from public;
grant execute on function public.regenerate_table_join_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Assigned players may update wallet/inventory on assigned characters
-- ---------------------------------------------------------------------------

create or replace function public.prevent_non_gm_reward_state_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_app_gm() then
    return new;
  end if;

  if exists (
    select 1
    from public.game_table_character_assignments assignments
    where assignments.character_id = new.id
      and assignments.user_id = auth.uid()
  ) then
    return new;
  end if;

  if new.inventory is distinct from old.inventory
    or new.wallet is distinct from old.wallet
    or new.reward_history is distinct from old.reward_history
    or new.progression is distinct from old.progression
    or new.conditions is distinct from old.conditions
  then
    raise exception 'Only GMs can modify character reward state.';
  end if;

  return new;
end;
$$;

drop policy if exists "Assigned players update assigned characters" on public.character_profiles;
create policy "Assigned players update assigned characters"
on public.character_profiles for update
to authenticated
using (
  exists (
    select 1
    from public.game_table_character_assignments assignments
    where assignments.character_id = character_profiles.id
      and assignments.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.game_table_character_assignments assignments
    where assignments.character_id = character_profiles.id
      and assignments.user_id = (select auth.uid())
  )
);

drop policy if exists "Table members update open markets" on public.markets;
create policy "Table members update open markets"
on public.markets for update
to authenticated
using (
  status = 'open'
  and public.is_game_table_member(game_table_id)
)
with check (
  status = 'open'
  and public.is_game_table_member(game_table_id)
);

drop policy if exists "Assigned players create market transactions" on public.market_transactions;
create policy "Assigned players create market transactions"
on public.market_transactions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.markets markets
    where markets.id = market_id
      and markets.status = 'open'
      and public.is_game_table_member(markets.game_table_id)
  )
  and exists (
    select 1
    from public.game_table_character_assignments assignments
    join public.markets markets on markets.id = market_id
    where assignments.table_id = markets.game_table_id
      and assignments.character_id = market_transactions.character_id
      and assignments.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.game_table_character_assignments;
  end if;
exception
  when duplicate_object then null;
end $$;
