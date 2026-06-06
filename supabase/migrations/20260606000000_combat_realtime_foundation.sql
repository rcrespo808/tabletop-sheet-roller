alter table public.combat_encounters
  add column if not exists version integer not null default 1;

create or replace function public.increment_combat_encounters_version()
returns trigger
language plpgsql
as $$
begin
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists set_combat_encounters_version on public.combat_encounters;
create trigger set_combat_encounters_version
before update on public.combat_encounters
for each row
execute function public.increment_combat_encounters_version();

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.combat_encounters;
  end if;
exception
  when duplicate_object then null;
end $$;
