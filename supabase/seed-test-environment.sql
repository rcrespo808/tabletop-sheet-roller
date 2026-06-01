-- Deterministic test environment seed for deploy previews/staging.
-- This file intentionally deletes and recreates the mock table data so deploys do not accumulate clutter.

begin;

do $$
begin
  delete from storage.objects
  where bucket_id in ('handout-images', 'handout-attachments')
    and name like '11111111-1111-4111-8111-111111111111/%';
exception
  when undefined_table then
    null;
end $$;

delete from public.handout_reward_applications
where game_table_id = '11111111-1111-4111-8111-111111111111';

delete from public.handouts
where game_table_id = '11111111-1111-4111-8111-111111111111';

delete from public.loot_tables
where campaign_id = '11111111-1111-4111-8111-111111111111';

delete from public.codex_entries
where campaign_id = '11111111-1111-4111-8111-111111111111';

delete from public.character_profiles
where game_table_id = '11111111-1111-4111-8111-111111111111';

delete from public.game_table_members
where table_id = '11111111-1111-4111-8111-111111111111';

delete from public.game_tables
where id = '11111111-1111-4111-8111-111111111111';

delete from public.app_user_profiles
where id in (
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
);

delete from auth.users
where id in (
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'gm.test@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Test GM","user_level":"gm"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'player.test@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Test Player","user_level":"player"}'::jsonb,
    now(),
    now()
  );

insert into public.app_user_profiles (id, email, display_name, user_level)
values
  ('22222222-2222-4222-8222-222222222222', 'gm.test@example.invalid', 'Test GM', 'gm'),
  ('33333333-3333-4333-8333-333333333333', 'player.test@example.invalid', 'Test Player', 'player')
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  user_level = excluded.user_level,
  updated_at = now();

insert into public.game_tables (id, owner_user_id, name, slug)
values (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Deploy Test Table',
  'deploy-test-table'
);

insert into public.game_table_members (table_id, user_id, user_level)
values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'gm'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'player');

insert into public.character_profiles (
  id,
  owner_user_id,
  owner_label,
  character_kind,
  game_table_id,
  name,
  subtitle,
  concept,
  portrait_image,
  default_system,
  sheets,
  inventory,
  wallet,
  reward_history,
  progression,
  conditions
)
values
  (
    'deploy-he-zhen',
    '33333333-3333-4333-8333-333333333333',
    'Test Player',
    'player_character',
    '11111111-1111-4111-8111-111111111111',
    'He Zhen',
    'Human monk / investigator',
    'A focused test character for handout rewards.',
    '/characters/he-zhen/sheet.png',
    'dnd5e',
    '{"dnd5e":{"system":"dnd5e","actions":[{"id":"quarterstaff","type":"dnd-roll","label":"Quarterstaff","roll":"1d20+5","notes":"Starter deploy seed action.","source":"custom"}],"notes":[]}}'::jsonb,
    '[]'::jsonb,
    '{"gp":0,"sp":0,"cp":0,"xp":0}'::jsonb,
    '[]'::jsonb,
    '{"level":1,"xp":0,"milestones":[]}'::jsonb,
    '[]'::jsonb
  ),
  (
    'deploy-reverend-of-rats',
    '22222222-2222-4222-8222-222222222222',
    'Test GM',
    'gm_character',
    '11111111-1111-4111-8111-111111111111',
    'Reverend of Rats',
    'NWoD antagonist',
    'A GM-side character for conditions, clues, and faction handouts.',
    null,
    'nwod',
    '{"nwod":{"system":"nwod","actions":[{"id":"vermin-sermon","type":"nwod-pool","label":"Vermin Sermon","pool":6,"notes":"Starter deploy seed action.","source":"custom"}],"notes":[]}}'::jsonb,
    '[]'::jsonb,
    '{"xp":0,"resources":1}'::jsonb,
    '[]'::jsonb,
    '{"xp":0,"milestones":[]}'::jsonb,
    '[]'::jsonb
  );

insert into public.codex_entries (
  id,
  campaign_id,
  system,
  type,
  name,
  subtitle,
  description,
  rules_text,
  tags,
  visibility,
  action_template,
  grants,
  prerequisites,
  source_label,
  metadata,
  created_by
)
values
  (
    '44444444-4444-4444-8444-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'dnd5e',
    'spell',
    'Moonbeam',
    'Radiant cylinder spell',
    'A concise test spell entry used by spell-scroll handouts.',
    'Concentration spell reminder. Targets in the beam make the relevant save.',
    array['spell', 'radiant', 'scroll'],
    'campaign',
    '{"id":"moonbeam","type":"note","label":"Moonbeam","notes":"Concentration radiant area spell.","source":"custom"}'::jsonb,
    '[{"type":"action","action":{"id":"moonbeam","type":"note","label":"Moonbeam","notes":"Concentration radiant area spell.","source":"custom"}}]'::jsonb,
    '[]'::jsonb,
    'Deploy seed',
    '{"seed":"deploy-test"}'::jsonb,
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '44444444-4444-4444-8444-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'nwod',
    'condition',
    'Informed',
    'Useful clue state',
    'A concise NWoD-style condition for clue and leverage testing.',
    'Use as a reminder that a character has actionable information.',
    array['condition', 'clue', 'leverage'],
    'campaign',
    null,
    '[{"type":"note","title":"Informed","body":"The character has actionable information from the current investigation."}]'::jsonb,
    '[]'::jsonb,
    'Deploy seed',
    '{"seed":"deploy-test"}'::jsonb,
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '44444444-4444-4444-8444-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'generic',
    'item',
    'Rat Chapel Reliquary',
    'Rare chapel relic',
    'A custom relic used by handouts and loot tables.',
    'Treat as a story item unless the GM attaches custom mechanics.',
    array['item', 'relic', 'rat-chapel'],
    'gm_only',
    null,
    '[{"type":"inventory_item","item":{"id":"rat-chapel-reliquary","name":"Rat Chapel Reliquary","quantity":1,"rarity":"rare","notes":"Deploy seed relic."}}]'::jsonb,
    '[]'::jsonb,
    'Deploy seed',
    '{"seed":"deploy-test"}'::jsonb,
    '22222222-2222-4222-8222-222222222222'
  );

insert into public.loot_tables (id, campaign_id, name, description, visibility, entries, created_by)
values
  (
    '55555555-5555-4555-8555-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Deploy Minor Coin Cache',
    'Deterministic deploy test loot for currency, item, and XP grants.',
    'campaign',
    '[
      {"id":"coin-gp","label":"Purse of test coins","weight":5,"reward":{"type":"currency","walletDelta":{"gp":25,"sp":4}}},
      {"id":"test-potion","label":"Potion of Healing","weight":3,"reward":{"type":"item","item":{"id":"deploy-potion-healing","name":"Potion of Healing","quantity":1,"rarity":"common","notes":"Deploy seed item."}}},
      {"id":"lesson","label":"Hard lesson","weight":1,"reward":{"type":"xp","amount":2}}
    ]'::jsonb,
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '55555555-5555-4555-8555-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'Deploy Rat Chapel Rewards',
    'Deterministic deploy test loot for codex, condition, and note rewards.',
    'gm_only',
    '[
      {"id":"reliquary","label":"Rat Chapel Reliquary","weight":1,"reward":{"type":"codex","codexEntryId":"44444444-4444-4444-8444-000000000003"}},
      {"id":"marked","label":"Marked by Vermin Gospel","weight":2,"reward":{"type":"condition","condition":{"id":"marked-by-vermin-gospel","name":"Marked by Vermin Gospel","description":"Rats react to the character as if marked by the chapel.","source":"Deploy Rat Chapel Rewards","expiresAt":null}}},
      {"id":"whisper","label":"Whispered clue","weight":2,"reward":{"type":"note","title":"Whispered Clue","body":"A test clue reward from the deploy seed."}}
    ]'::jsonb,
    '22222222-2222-4222-8222-222222222222'
  );

insert into public.handouts (
  id,
  game_table_id,
  kind,
  title,
  subtitle,
  body,
  visibility,
  selected_player_ids,
  tags,
  reward_payloads,
  codex_entry_ids,
  revealed_at,
  created_by
)
values
  (
    '66666666-6666-4666-8666-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'lore',
    'Deploy Lore: The Rat Chapel',
    'Baseline lore handout',
    'A compact lore handout used to verify campaign-visible rendering.',
    'campaign',
    '{}',
    array['deploy-test', 'lore'],
    '[]'::jsonb,
    '{}',
    now(),
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'wanted_poster',
    'Deploy Wanted Poster: Rat Chapel Heretic',
    'Bounty reward test',
    'A wanted poster that grants coin, a condition, and a note.',
    'campaign',
    '{}',
    array['deploy-test', 'bounty'],
    '[
      {"type":"currency","walletDelta":{"gp":75}},
      {"type":"condition","condition":{"id":"wanted-by-veinwatch","name":"Wanted by Veinwatch","description":"Veinwatch recognizes the character as connected to the Rat Chapel case.","source":"Deploy Wanted Poster","expiresAt":null}},
      {"type":"note","title":"Veinwatch Recognition","body":"The Veinwatch now recognizes this character as connected to the Rat Chapel case."}
    ]'::jsonb,
    '{}',
    now(),
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'spell_scroll',
    'Deploy Spell Scroll: Moonbeam',
    'Codex spell grant test',
    'A silvered test scroll that links to the Moonbeam codex entry.',
    'campaign',
    '{}',
    array['deploy-test', 'scroll'],
    '[
      {"type":"codex","codexEntryId":"44444444-4444-4444-8444-000000000001"},
      {"type":"item","item":{"id":"spell-scroll-moonbeam","name":"Spell Scroll: Moonbeam","quantity":1,"rarity":"uncommon","notes":"Deploy seed scroll.","codexEntryId":"44444444-4444-4444-8444-000000000001"}}
    ]'::jsonb,
    array['44444444-4444-4444-8444-000000000001']::uuid[],
    now(),
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'treasure_note',
    'Deploy Treasure Note: Smuggler Cache',
    'Selected-player reward test',
    'A ledger page with coin, relic, and XP rewards.',
    'selected_players',
    array['33333333-3333-4333-8333-333333333333']::uuid[],
    array['deploy-test', 'treasure'],
    '[
      {"type":"currency","walletDelta":{"gp":120}},
      {"type":"item","item":{"id":"rat-chapel-reliquary","name":"Rat Chapel Reliquary","quantity":1,"rarity":"rare","notes":"Deploy seed relic."}},
      {"type":"xp","amount":2}
    ]'::jsonb,
    array['44444444-4444-4444-8444-000000000003']::uuid[],
    now(),
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000005',
    '11111111-1111-4111-8111-111111111111',
    'contract',
    'Deploy Contract: Veinwatch Retainer',
    'Contract handout type test',
    'A faction contract that grants resources and an obligation note.',
    'campaign',
    '{}',
    array['deploy-test', 'contract'],
    '[
      {"type":"currency","walletDelta":{"resources":1}},
      {"type":"note","title":"Veinwatch Retainer","body":"The character has accepted a temporary Veinwatch obligation."}
    ]'::jsonb,
    '{}',
    now(),
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000006',
    '11111111-1111-4111-8111-111111111111',
    'clue',
    'Deploy Clue: Speaking Rats',
    'Clue handout type test',
    'A clue handout that grants the Informed codex entry.',
    'campaign',
    '{}',
    array['deploy-test', 'clue'],
    '[{"type":"codex","codexEntryId":"44444444-4444-4444-8444-000000000002"}]'::jsonb,
    array['44444444-4444-4444-8444-000000000002']::uuid[],
    now(),
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000007',
    '11111111-1111-4111-8111-111111111111',
    'condition_notice',
    'Deploy Condition Notice: Vermin Fever',
    'GM-only disease notice test',
    'A GM-facing exposure notice that applies a condition and note.',
    'gm_only',
    '{}',
    array['deploy-test', 'condition'],
    '[
      {"type":"condition","condition":{"id":"vermin-fever","name":"Vermin Fever","description":"Fever, shakes, and animal aversion after chapel exposure.","source":"Deploy Condition Notice","expiresAt":null}},
      {"type":"note","title":"Vermin Fever Symptoms","body":"Track symptoms and escalation manually during tests."}
    ]'::jsonb,
    '{}',
    null,
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    '66666666-6666-4666-8666-000000000008',
    '11111111-1111-4111-8111-111111111111',
    'faction_letter',
    'Deploy Faction Letter: Veinwatch Report',
    'Faction letter handout type test',
    'A coded report that grants leverage and the Informed codex entry.',
    'campaign',
    '{}',
    array['deploy-test', 'faction'],
    '[
      {"type":"note","title":"Leverage: Veinwatch Informant Network","body":"The character can reference this report for leverage."},
      {"type":"codex","codexEntryId":"44444444-4444-4444-8444-000000000002"}
    ]'::jsonb,
    array['44444444-4444-4444-8444-000000000002']::uuid[],
    now(),
    '22222222-2222-4222-8222-222222222222'
  );

insert into public.handout_gm_notes (handout_id, gm_notes)
values
  ('66666666-6666-4666-8666-000000000002', 'Deploy seed: apply this to He Zhen to verify bounty reward flow.'),
  ('66666666-6666-4666-8666-000000000007', 'Deploy seed: GM-only condition notice; players should not see this handout or note.')
on conflict (handout_id) do update
set
  gm_notes = excluded.gm_notes,
  updated_at = now();

commit;
