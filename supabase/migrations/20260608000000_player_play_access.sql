-- Global player play access: pending / approved / rejected gate with table-GM review.

do $$
begin
  create type public.play_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

alter table public.app_user_profiles
  add column if not exists play_status public.play_status not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

update public.app_user_profiles
set play_status = 'approved'
where play_status = 'pending';

update public.app_user_profiles
set play_status = 'approved'
where user_level = 'gm';

create index if not exists app_user_profiles_play_status_idx
  on public.app_user_profiles (play_status);

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_table_gm_anywhere()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.game_tables tables
    where tables.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.game_table_members members
    where members.user_id = auth.uid()
      and members.user_level = 'gm'
  );
$$;

create or replace function public.is_app_approved()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_app_gm()
    or public.is_table_gm_anywhere()
    or exists (
      select 1
      from public.app_user_profiles profiles
      where profiles.id = auth.uid()
        and profiles.play_status = 'approved'
    );
$$;

-- ---------------------------------------------------------------------------
-- Signup trigger: new players start pending; seeded app GMs are approved
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_level public.user_level;
  initial_play_status public.play_status;
begin
  requested_level := 'player'::public.user_level;

  initial_play_status :=
    case
      when new.raw_user_meta_data ->> 'user_level' = 'gm' then 'approved'::public.play_status
      else 'pending'::public.play_status
    end;

  insert into public.app_user_profiles (id, email, display_name, user_level, play_status)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    requested_level,
    initial_play_status
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.app_user_profiles.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-approve table owners on create (GM bootstrap)
-- ---------------------------------------------------------------------------

create or replace function public.approve_table_owner_on_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is not null then
    update public.app_user_profiles
    set
      play_status = 'approved',
      reviewed_at = coalesce(reviewed_at, now()),
      reviewed_by = coalesce(reviewed_by, new.owner_user_id),
      updated_at = now()
    where id = new.owner_user_id
      and play_status <> 'approved';
  end if;

  return new;
end;
$$;

drop trigger if exists approve_owner_on_game_table_create on public.game_tables;
create trigger approve_owner_on_game_table_create
after insert on public.game_tables
for each row
execute function public.approve_table_owner_on_create();

-- ---------------------------------------------------------------------------
-- GM review RPC
-- ---------------------------------------------------------------------------

create or replace function public.review_player_access(
  p_user_id uuid,
  p_action text
)
returns public.play_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := auth.uid();
  v_next_status public.play_status;
begin
  if v_reviewer is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_table_gm_anywhere() then
    raise exception 'Only table GMs can review player access';
  end if;

  if p_user_id is null or p_user_id = v_reviewer then
    raise exception 'Invalid review target';
  end if;

  v_next_status :=
    case lower(btrim(p_action))
      when 'approve' then 'approved'::public.play_status
      when 'reject' then 'rejected'::public.play_status
      else null
    end;

  if v_next_status is null then
    raise exception 'Action must be approve or reject';
  end if;

  update public.app_user_profiles
  set
    play_status = v_next_status,
    reviewed_at = now(),
    reviewed_by = v_reviewer,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Player profile not found';
  end if;

  return v_next_status;
end;
$$;

revoke all on function public.review_player_access(uuid, text) from public;
grant execute on function public.review_player_access(uuid, text) to authenticated;

revoke all on function public.is_table_gm_anywhere() from public;
grant execute on function public.is_table_gm_anywhere() to authenticated;

-- ---------------------------------------------------------------------------
-- join_game_table: pending players cannot join until approved
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

  if not public.is_app_approved() then
    raise exception 'Your account is awaiting GM approval before you can join a table';
  end if;

  insert into public.game_table_members (table_id, user_id, user_level)
  values (v_table_id, v_user_id, 'player')
  on conflict (table_id, user_id) do nothing;

  return v_table_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_user_profiles RLS: self read + table GMs read pending queue
-- ---------------------------------------------------------------------------

drop policy if exists "Users read own app profile" on public.app_user_profiles;
create policy "Users read own app profile"
on public.app_user_profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_table_gm_anywhere()
);

drop policy if exists "Users update own app profile" on public.app_user_profiles;
create policy "Users update own app profile"
on public.app_user_profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and play_status = (
    select profiles.play_status
    from public.app_user_profiles profiles
    where profiles.id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Core data policies: require approved play access
-- ---------------------------------------------------------------------------

drop policy if exists "Users read own and legacy character profiles" on public.character_profiles;
create policy "Users read own and legacy character profiles"
on public.character_profiles for select
to authenticated
using (
  public.is_app_approved()
  and (
    owner_user_id is null
    or owner_user_id = auth.uid()
  )
);

drop policy if exists "Users create own character profiles" on public.character_profiles;
create policy "Users create own character profiles"
on public.character_profiles for insert
to authenticated
with check (
  public.is_app_approved()
  and owner_user_id = auth.uid()
);

drop policy if exists "Users update own character profiles" on public.character_profiles;
create policy "Users update own character profiles"
on public.character_profiles for update
to authenticated
using (
  public.is_app_approved()
  and (owner_user_id is null or owner_user_id = auth.uid())
)
with check (
  public.is_app_approved()
  and owner_user_id = auth.uid()
);

drop policy if exists "Users delete own character profiles" on public.character_profiles;
create policy "Users delete own character profiles"
on public.character_profiles for delete
to authenticated
using (
  public.is_app_approved()
  and owner_user_id = auth.uid()
);

drop policy if exists "Table members read tables" on public.game_tables;
create policy "Table members read tables"
on public.game_tables for select
to authenticated
using (
  owner_user_id = auth.uid()
  or (
    public.is_app_approved()
    and public.is_game_table_member(id)
  )
);

drop policy if exists "GMs create owned tables" on public.game_tables;
create policy "GMs create owned tables"
on public.game_tables for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "Owners update tables" on public.game_tables;
create policy "Owners update tables"
on public.game_tables for update
to authenticated
using (
  public.is_app_approved()
  and owner_user_id = auth.uid()
)
with check (
  public.is_app_approved()
  and owner_user_id = auth.uid()
);

drop policy if exists "Owners delete tables" on public.game_tables;
create policy "Owners delete tables"
on public.game_tables for delete
to authenticated
using (
  public.is_app_approved()
  and owner_user_id = auth.uid()
);
