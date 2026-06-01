-- Let the live app read the seeded starter loot tables with the browser publishable key.

update public.loot_tables
set
  visibility = 'campaign',
  updated_at = now()
where id in (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102'
);

grant usage on schema public to anon, authenticated;
grant select on public.loot_tables to anon, authenticated;

drop policy if exists "Public read starter loot tables" on public.loot_tables;
create policy "Public read starter loot tables"
on public.loot_tables for select
to anon, authenticated
using (
  campaign_id = '00000000-0000-4000-8000-000000000013'
);
