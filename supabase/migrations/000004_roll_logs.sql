-- Roll log persistence for shared table sessions
-- WARNING: RLS policies below are permissive for MVP/demo use only.

create table if not exists public.roll_logs (
  id text primary key,
  room_slug text not null default 'default',
  character_id text,
  character_name text,
  system text check (system is null or system in ('dnd5e', 'nwod')),
  kind text not null default 'roll' check (kind in ('roll', 'note', 'system')),
  action_label text,
  expression text,
  result_text text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists roll_logs_room_slug_created_at_idx
  on public.roll_logs (room_slug, created_at desc);

alter table public.roll_logs enable row level security;

drop policy if exists "Public read roll logs" on public.roll_logs;
create policy "Public read roll logs"
on public.roll_logs for select
using (true);

drop policy if exists "Public insert roll logs" on public.roll_logs;
create policy "Public insert roll logs"
on public.roll_logs for insert
with check (true);

drop policy if exists "Public delete roll logs" on public.roll_logs;
create policy "Public delete roll logs"
on public.roll_logs for delete
using (true);
