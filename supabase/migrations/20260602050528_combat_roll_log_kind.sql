alter table public.roll_logs
  drop constraint if exists roll_logs_kind_check;

alter table public.roll_logs
  add constraint roll_logs_kind_check
  check (kind in ('roll', 'note', 'system', 'combat'));
