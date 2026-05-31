-- Inventory, rewards, progression, and active condition foundations.

alter table public.character_profiles
  add column if not exists inventory jsonb not null default '[]'::jsonb;

alter table public.character_profiles
  add column if not exists wallet jsonb not null default '{}'::jsonb;

alter table public.character_profiles
  add column if not exists reward_history jsonb not null default '[]'::jsonb;

alter table public.character_profiles
  add column if not exists progression jsonb not null default '{}'::jsonb;

alter table public.character_profiles
  add column if not exists conditions jsonb not null default '[]'::jsonb;

drop policy if exists "Users read own and legacy character profiles" on public.character_profiles;
create policy "Users read own and legacy character profiles"
on public.character_profiles for select
using (
  owner_user_id is null
  or owner_user_id = auth.uid()
  or public.is_app_gm()
);

drop policy if exists "Users update own character profiles" on public.character_profiles;
create policy "Users update own character profiles"
on public.character_profiles for update
using (
  owner_user_id is null
  or owner_user_id = auth.uid()
  or public.is_app_gm()
)
with check (
  owner_user_id = auth.uid()
  or public.is_app_gm()
);

drop policy if exists "Users delete own character profiles" on public.character_profiles;
create policy "Users delete own character profiles"
on public.character_profiles for delete
using (
  owner_user_id = auth.uid()
  or public.is_app_gm()
);

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

drop trigger if exists prevent_non_gm_reward_state_changes on public.character_profiles;
create trigger prevent_non_gm_reward_state_changes
before update on public.character_profiles
for each row
execute function public.prevent_non_gm_reward_state_changes();
