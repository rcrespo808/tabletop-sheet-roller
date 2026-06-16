-- Ensure every owned game table has an owner GM membership row.

create or replace function public.ensure_game_table_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is not null then
    insert into public.game_table_members (table_id, user_id, user_level)
    values (new.id, new.owner_user_id, 'gm')
    on conflict (table_id, user_id) do update
    set user_level = 'gm';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_owner_membership_on_game_table_create on public.game_tables;
create trigger ensure_owner_membership_on_game_table_create
after insert on public.game_tables
for each row
execute function public.ensure_game_table_owner_membership();

insert into public.game_table_members (table_id, user_id, user_level)
select tables.id, tables.owner_user_id, 'gm'
from public.game_tables tables
where tables.owner_user_id is not null
on conflict (table_id, user_id) do update
set user_level = 'gm';
