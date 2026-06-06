-- Temporary market sessions with permanent transaction history.

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  game_table_id uuid not null references public.game_tables(id) on delete cascade,
  name text not null,
  description text,
  location text,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed')),
  stores jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_transactions (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  store_id text not null,
  character_id text not null,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  type text not null check (type in ('buy', 'sell')),
  item_name text not null,
  item jsonb,
  quantity integer not null default 1 check (quantity > 0),
  price jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists markets_game_table_id_idx
  on public.markets(game_table_id);

create index if not exists markets_status_idx
  on public.markets(status);

create index if not exists market_transactions_market_id_created_at_idx
  on public.market_transactions(market_id, created_at desc);

create index if not exists market_transactions_character_id_idx
  on public.market_transactions(character_id);

alter table public.markets enable row level security;
alter table public.market_transactions enable row level security;

grant select, insert, update, delete on public.markets to authenticated;
grant select, insert on public.market_transactions to authenticated;

drop policy if exists "Markets read visible rows" on public.markets;
create policy "Markets read visible rows"
on public.markets for select
to authenticated
using (
  public.is_app_gm()
  or public.is_game_table_gm(game_table_id)
  or (
    status = 'open'
    and public.is_game_table_member(game_table_id)
  )
);

drop policy if exists "Markets GMs create" on public.markets;
create policy "Markets GMs create"
on public.markets for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    public.is_app_gm()
    or public.is_game_table_gm(game_table_id)
  )
);

drop policy if exists "Markets GMs update" on public.markets;
create policy "Markets GMs update"
on public.markets for update
to authenticated
using (
  public.is_app_gm()
  or public.is_game_table_gm(game_table_id)
)
with check (
  public.is_app_gm()
  or public.is_game_table_gm(game_table_id)
);

drop policy if exists "Markets GMs delete" on public.markets;
create policy "Markets GMs delete"
on public.markets for delete
to authenticated
using (
  public.is_app_gm()
  or public.is_game_table_gm(game_table_id)
);

drop policy if exists "Market transactions read visible rows" on public.market_transactions;
create policy "Market transactions read visible rows"
on public.market_transactions for select
to authenticated
using (
  exists (
    select 1
    from public.markets markets
    where markets.id = market_id
      and (
        public.is_app_gm()
        or public.is_game_table_gm(markets.game_table_id)
        or user_id = (select auth.uid())
        or exists (
          select 1
          from public.character_profiles characters
          where characters.id = character_id
            and characters.owner_user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Market transactions GMs create" on public.market_transactions;
create policy "Market transactions GMs create"
on public.market_transactions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.markets markets
    where markets.id = market_id
      and markets.status = 'open'
      and (
        public.is_app_gm()
        or public.is_game_table_gm(markets.game_table_id)
      )
  )
);

drop trigger if exists set_markets_updated_at on public.markets;
create trigger set_markets_updated_at
before update on public.markets
for each row
execute function public.set_updated_at();

insert into public.markets (
  id,
  game_table_id,
  name,
  description,
  location,
  status,
  stores,
  metadata,
  created_by,
  opened_at,
  closed_at
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000013',
    'D&D Adventurer''s Test Market',
    'A clean D&D 5e test market with mundane gear, scrolls, healing stock, and one gated rare item.',
    'Hollowford East Gate',
    'open',
    $json$[
      {
        "id": "east-gate-outfitter",
        "name": "East Gate Outfitter",
        "theme": "general",
        "description": "Reliable adventuring supplies for quick buy/sell regression tests.",
        "quality": 3,
        "scarcity": 2,
        "meanRarity": "common",
        "priceMultiplier": 1,
        "sellMultiplier": 0.5,
        "stock": [
          {
            "id": "dnd-rope-silk",
            "item": {
              "id": "dnd-rope-silk",
              "name": "Silk Rope",
              "quantity": 1,
              "rarity": "common",
              "notes": "50 feet of strong, light rope.",
              "tags": ["gear", "climbing"]
            },
            "price": { "gp": 10 },
            "quantityAvailable": 5,
            "rarity": "common",
            "tags": ["gear", "climbing"],
            "source": "manual"
          },
          {
            "id": "dnd-healing-potion",
            "item": {
              "id": "dnd-healing-potion",
              "name": "Potion of Healing",
              "quantity": 1,
              "rarity": "common",
              "notes": "Regain 2d4+2 hit points when consumed.",
              "powers": [
                {
                  "id": "power-drink-healing-potion",
                  "label": "Drink Potion",
                  "description": "Regain 2d4+2 hit points; consumed on use.",
                  "action": {
                    "id": "action-drink-healing-potion",
                    "type": "dnd-roll",
                    "label": "Potion Healing",
                    "roll": "2d4+2",
                    "notes": "Healing from a standard potion."
                  },
                  "consumesItem": true
                }
              ],
              "tags": ["potion", "healing", "consumable"]
            },
            "price": { "gp": 50 },
            "quantityAvailable": 4,
            "rarity": "common",
            "tags": ["potion", "healing"],
            "source": "manual"
          },
          {
            "id": "dnd-scroll-magic-missile",
            "item": {
              "id": "dnd-scroll-magic-missile",
              "name": "Spell Scroll: Magic Missile",
              "quantity": 1,
              "rarity": "uncommon",
              "notes": "A first-level spell scroll for testing inventory powers.",
              "powers": [
                {
                  "id": "power-scroll-magic-missile",
                  "label": "Cast Magic Missile",
                  "description": "Cast Magic Missile from the scroll; consumed on use.",
                  "action": {
                    "id": "action-scroll-magic-missile",
                    "type": "dnd-roll",
                    "label": "Magic Missile Damage",
                    "roll": "3d4+3",
                    "notes": "Force damage split as the caster chooses."
                  },
                  "consumesItem": true
                }
              ],
              "tags": ["spell", "scroll", "arcane"]
            },
            "price": { "gp": 85 },
            "quantityAvailable": 2,
            "rarity": "uncommon",
            "tags": ["spell", "scroll"],
            "source": "manual"
          }
        ]
      },
      {
        "id": "oathbound-armory",
        "name": "Oathbound Armory",
        "theme": "blacksmith",
        "description": "Weapons and armor for transaction and stock decrement tests.",
        "quality": 4,
        "scarcity": 3,
        "meanRarity": "uncommon",
        "priceMultiplier": 1.1,
        "sellMultiplier": 0.45,
        "stock": [
          {
            "id": "dnd-silvered-shortsword",
            "item": {
              "id": "dnd-silvered-shortsword",
              "name": "Silvered Shortsword",
              "quantity": 1,
              "rarity": "common",
              "notes": "A silvered blade for monsters with silver vulnerabilities.",
              "tags": ["weapon", "silvered"]
            },
            "price": { "gp": 125 },
            "quantityAvailable": 2,
            "rarity": "common",
            "tags": ["weapon", "silvered"],
            "source": "manual"
          },
          {
            "id": "dnd-sentinel-shield",
            "item": {
              "id": "dnd-sentinel-shield",
              "name": "Sentinel Shield",
              "quantity": 1,
              "rarity": "uncommon",
              "notes": "Test rare-ish stock. Grants advantage on initiative and Perception checks while held.",
              "tags": ["shield", "magic"]
            },
            "price": { "gp": 350 },
            "quantityAvailable": 1,
            "rarity": "uncommon",
            "tags": ["shield", "magic"],
            "requiresGmApproval": true,
            "source": "manual"
          }
        ]
      }
    ]$json$::jsonb,
    '{"source":"migration","system":"dnd5e","purpose":"test-market"}'::jsonb,
    null,
    now(),
    null
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000013',
    'NWoD Street Test Market',
    'A street-level NWoD test market using cash and resources-style custom currency.',
    'Rat Chapel Back Rooms',
    'open',
    $json$[
      {
        "id": "after-hours-fixer",
        "name": "After-Hours Fixer",
        "theme": "black_market",
        "description": "Burner phones, illegal tools, and favors priced in cash.",
        "quality": 3,
        "scarcity": 3,
        "meanRarity": "common",
        "priceMultiplier": 1.2,
        "sellMultiplier": 0.3,
        "stock": [
          {
            "id": "nwod-burner-phone-pack",
            "item": {
              "id": "nwod-burner-phone-pack",
              "name": "Burner Phone Pack",
              "quantity": 1,
              "rarity": "common",
              "notes": "Three prepaid phones for contacts, dead drops, and surveillance tests.",
              "tags": ["equipment", "intel"]
            },
            "price": { "custom": { "cash": 40 } },
            "quantityAvailable": 4,
            "rarity": "common",
            "tags": ["equipment", "intel"],
            "source": "manual"
          },
          {
            "id": "nwod-lock-bypass-kit",
            "item": {
              "id": "nwod-lock-bypass-kit",
              "name": "Lock Bypass Kit",
              "quantity": 1,
              "rarity": "common",
              "notes": "A practical kit for Larceny scenes.",
              "tags": ["tool", "larceny"]
            },
            "price": { "custom": { "cash": 75 } },
            "quantityAvailable": 2,
            "rarity": "common",
            "tags": ["tool", "larceny"],
            "source": "manual"
          }
        ]
      },
      {
        "id": "occult-curio-dealer",
        "name": "Occult Curio Dealer",
        "theme": "arcane",
        "description": "Questionable relics and condition-style supernatural tools.",
        "quality": 4,
        "scarcity": 4,
        "meanRarity": "uncommon",
        "priceMultiplier": 1.4,
        "sellMultiplier": 0.25,
        "stock": [
          {
            "id": "nwod-rat-bone-rosary",
            "item": {
              "id": "nwod-rat-bone-rosary",
              "name": "Rat-Bone Rosary",
              "quantity": 1,
              "rarity": "uncommon",
              "notes": "A focus for vermin-haunted occult investigation scenes.",
              "powers": [
                {
                  "id": "power-rat-bone-focus",
                  "label": "Vermin Focus",
                  "description": "Add a +1 situational bonus to one Occult or Investigation pool involving vermin signs.",
                  "action": {
                    "id": "action-rat-bone-focus",
                    "type": "nwod-pool",
                    "label": "Vermin Focus",
                    "pool": 1,
                    "notes": "Add this as a situational bonus die when the GM agrees."
                  },
                  "charges": { "current": 1, "max": 1, "reset": "session" }
                }
              ],
              "tags": ["occult", "vermin", "tool"]
            },
            "price": { "custom": { "resources": 1 } },
            "quantityAvailable": 1,
            "rarity": "uncommon",
            "tags": ["occult", "vermin"],
            "source": "manual"
          },
          {
            "id": "nwod-confession-ledger",
            "item": {
              "id": "nwod-confession-ledger",
              "name": "Confession Ledger Copy",
              "quantity": 1,
              "rarity": "rare",
              "notes": "Blackmail material for social leverage and faction testing.",
              "tags": ["intel", "leverage", "black_market"]
            },
            "price": { "custom": { "resources": 2 } },
            "quantityAvailable": 1,
            "rarity": "rare",
            "tags": ["intel", "leverage"],
            "requiresGmApproval": true,
            "source": "manual"
          }
        ]
      }
    ]$json$::jsonb,
    '{"source":"migration","system":"nwod","purpose":"test-market"}'::jsonb,
    null,
    now(),
    null
  )
on conflict (id) do update
set
  game_table_id = excluded.game_table_id,
  name = excluded.name,
  description = excluded.description,
  location = excluded.location,
  status = excluded.status,
  stores = excluded.stores,
  metadata = excluded.metadata,
  opened_at = excluded.opened_at,
  closed_at = excluded.closed_at,
  updated_at = now();
