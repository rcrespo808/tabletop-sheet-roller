# Dicer

Dicer is a browser-based virtual tabletop and campaign operations app for
character-driven tabletop RPG sessions. It started as a character sheet roller
and now includes character persistence, table membership, player review, combat,
loot, handouts, codex entries, market transactions, branching campaign paths,
and a project-specific Supabase content MCP.

This is an active WIP portfolio project. It is useful for local and hosted
testing, but it is not production-ready yet.

## Current Implementation

### App Shell and Navigation

- Next.js App Router application with React client pages and Tailwind styling.
- Home page character gallery at `/` with quick navigation to Codex, Loot,
  Paths, Handouts, Markets, Tables, and Combat.
- Reusable campaign layout components under `src/components/campaign`, including
  module headers, GM/player seat mode tabs, master-detail layouts, and active
  table status.
- Reusable glass panel, status badge, action button, image upload, roll log, and
  system badge components.
- Route-level pages for login, auth confirmation, pending access, player review,
  table join, table lobby, character workspace, combat, codex, loot, handouts,
  markets, and paths.

### Authentication and Access

- Supabase auth integration through `@supabase/ssr` and `@supabase/supabase-js`.
- Middleware refreshes Supabase sessions and keeps auth cookies current.
- Login and email confirmation flow redirects through `/auth/confirm`.
- `app_user_profiles` play access model with `pending`, `approved`, and
  `rejected` states.
- Pending players are gated to `/pending` until approved.
- App GMs and table GMs can review pending players through `/review/players`.
- Access rules are covered by `src/lib/auth/accessControl.test.ts`.

### Storage Modes

- Most feature repositories support hosted Supabase storage and browser-local
  fallback.
- Storage status badges show whether a surface is using Supabase, local storage,
  auth-required local mode, or Supabase fallback.
- Character reads merge remote profiles with local cache and refresh the local
  cache after successful remote loads.
- Character saves normalize custom profile data, attach the signed-in owner when
  needed, sync Supabase character image assets, and cache locally.
- Local fallback keeps the app usable without Supabase env vars.

### Characters and Sheets

- Character gallery supports built-in seed profiles and custom/imported profiles.
- Character workspace supports D&D 5e, NWoD, and custom sheet data where present.
- Structured stats drive quick rolls, prepared actions, and combat action
  derivation.
- Character panels cover overview, notes, images, rewards, rest controls,
  inventory, wallet, progression, conditions, and system stats.
- Image support includes browser-local assets and Supabase storage URLs.
- Legacy character aliases are handled during character lookup.
- Rest controls apply short-rest and long-rest style state updates.

### Dice and Roll Logs

- Dice libraries support D&D-style expressions and New World of Darkness dice
  pools.
- Roll log repositories support local and Supabase-backed logs.
- Roll logs can be scoped by room, including the combat room.
- Combat resolutions can generate both combat history entries and roll log
  entries.
- Roll export helpers are available under `src/lib/rollLog`.

### Combat

- Combat page at `/combat` has setup, GM, and player modes.
- Encounters support D&D 5e and NWoD systems, draft/active/completed states,
  rounds, initiative turn index, combatants, pending player actions, and action
  history.
- GM setup can create encounters, select system, add compatible player
  characters, add NPC templates in quantity, rename encounters, start/end
  encounters, and delete encounters.
- GM mode supports target selection, command menus, resolving attacks, resolving
  pending player actions, manual damage, healing, status changes, active-turn
  override, previous/next turn, and full combat log drawer.
- Player mode limits declarations to controlled combatants and waits for GM
  resolution.
- Turn advancement clears stale pending actions.
- Realtime Supabase combat subscription updates the selected encounter and
  removes deleted encounters.
- Combat tests cover attack resolution, pending action resolution, and turn
  behavior.

### Campaign Tables and Seats

- `/tables` lists tables owned by or joined by the signed-in user.
- Users can create tables, join with a code, leave tables, set an active table,
  and open a table lobby.
- Table owners are treated as GMs and are now ensured as GM members both in the
  client repository and by migration
  `20260615200500_game_table_owner_memberships.sql`.
- Active table ID is stored in session storage and now publishes same-tab and
  storage events so hooks update after changes.
- Table lobby supports member role updates, member removal, character listing,
  character assignments, unassignment, join-code regeneration, and campaign
  module shortcuts.
- Seat resolution controls whether a user can manage a table, declare actions,
  or operate as player/GM in modules.
- Permission tests live in `src/lib/session/permissions.test.ts`.

### Branching Paths

- `/paths` implements node-based campaign progression for travel, dungeons,
  story arcs, rewards, and branching decisions.
- Paths have draft/active/completed/archived status and gm-only, selected-player,
  campaign, or public visibility.
- Nodes support story, choice, combat, loot, handout, market, rest, skill check,
  codex, condition, reward, boss, exit, and custom kinds.
- Node statuses include hidden, available, visited, resolved, locked, failed,
  and skipped.
- GM manage mode can create/edit/archive/delete paths, import starter paths,
  import/export JSON, edit nodes, edit edges, reveal/hide/lock/unlock/visit/
  resolve/fail/skip nodes, and inspect path history.
- Play mode filters visibility and shows only eligible active content.
- Outcomes can apply reward grants, roll loot tables, open markets, start combat
  notes, reveal handouts, unlock codex entries, apply conditions, perform rest
  outcomes, log messages, or carry custom metadata.
- Path validation and engine tests live under `src/lib/paths`.

### Codex

- `/codex` manages campaign knowledge, powers, features, conditions, curses,
  blessings, items, loot notes, spells, rites, merits, and generic entries.
- Entries support generic, D&D 5e, and NWoD systems; campaign, GM-only, and
  public visibility; tags; rules text; prerequisites; grants; metadata; and
  optional action templates.
- Manage mode can create, edit, delete, import seed entries, and import/export
  codex JSON.
- Play mode can search/filter entries and add selected entry effects to a
  character.
- Add-to-character can append action templates, inventory items, conditions, and
  notes while avoiding duplicates.
- Stat modifier grants are currently converted to manual note actions until
  automated stat mutation exists.
- New combat-rules codex content and research artifacts are present under
  `src/data/codex/combat-rules.ts` and `docs/codex-combat-rules*`.

### Loot, Rewards, and Inventory

- Loot tables support weighted rewards, starter data, public starter tables, and
  item-power loot table migrations.
- Reward application can update inventory, wallet, conditions, progression,
  reward history, notes, actions, and codex-related character state.
- Character reward history keeps grant provenance so changes can be traced.
- Handouts and paths can trigger reward grants.
- The service-role reward-state trigger bypass migration is present at
  `20260608173950_allow_service_role_character_reward_state.sql`.

### Handouts

- `/handouts` provides campaign handout management around seeded and persisted
  handouts.
- Handouts support clues, lore, reward grants, unlock-style interactions, and
  file-backed image/document storage helpers.
- Handout reward behavior has smoke documentation in
  `docs/handout-reward-test.md`.

### Markets

- `/markets` provides starter marketplace content and transaction helpers.
- Market logic supports item pricing, buying/selling style transaction
  operations, and integration with character wallet/inventory state.
- Starter market data lives under `src/data/markets/starterMarkets.ts`.

### Supabase Schema

- Migrations cover character persistence, image storage, auth roles, roll logs,
  codex entries, operational content tables, inventory/rewards/progression, loot
  tables, handouts, item powers, combat encounters, markets, branching paths,
  realtime foundations, player play access, table sessions, member realtime,
  profile realtime, GM combat permissions, service-role reward writes, and owner
  memberships.
- Seed scripts provide baseline and test data.
- Deployment notes live in `docs/deployment.md`.

### Realtime

- Realtime foundations exist for combat encounters, table members, character
  profiles, and reusable table subscriptions.
- The latest local commit fixes realtime subscription channel reuse.
- The gallery refreshes character profiles on realtime profile changes.
- Combat subscribes to the active encounter when Supabase storage and auth are
  available.

### Dicer Content MCP

- Project MCP server lives under `tools/dicer-content-mcp`.
- It can audit schema, list content context, read/write Supabase Data API rows,
  update character profiles, execute direct SQL when a database URL is
  configured, generate content packs, preview content packs, apply content
  packs, and patch JSON rows.
- Character edits should use `update_character_profile` first with
  `confirmProjectRef: "toogirtxlnsbtvmqcqgw"` for writes.
- Generated content workflow is `generate_content_pack`, then
  `preview_content_pack`, then `apply_content_pack`.
- MCP tests cover schemas, JSON helpers, normalizers, OpenAI integration helpers,
  and tools.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 6
- Tailwind CSS
- Supabase Auth, Postgres, Storage, RLS, RPC, and Realtime
- Vercel deployment path with GitHub Actions
- Node test runner through `tsx`
- Model Context Protocol SDK for the Dicer content MCP
- OpenAI SDK for generated content packs

## Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the content MCP locally:

```bash
npm run content:mcp --silent
```

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase values when hosted
persistence is needed.

Common app values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

MCP/admin automation values:

```env
SUPABASE_PROJECT_ID=toogirtxlnsbtvmqcqgw
SUPABASE_SECRET_KEY=
# or
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
# or
DATABASE_URL=
OPENAI_API_KEY=
DICER_CONTENT_MODEL=gpt-5.5
```

Do not commit `.env.local`, service-role keys, database passwords, Supabase
access tokens, Vercel tokens, or generated MCP run logs.

## Deployment

- GitHub Actions run CI checks and can run Supabase migrations.
- Production Vercel deploys are handled by `.github/workflows/deploy.yml`.
- Supabase auth redirect synchronization is handled by
  `scripts/sync-supabase-auth-config.sh` when the required secrets are present.
- Full setup details are in `docs/deployment.md`.

## Pending Tasks

### Stabilize Table and Auth Flows

- Verify the new owner-membership migration against hosted Supabase and confirm
  existing table owners appear as GM members after migration.
- Confirm table creation, active-table switching, and table lobby loading after
  redirects on localhost and production.
- Finish tightening Supabase middleware behavior now that route blocking moved
  to the client access gate.
- Expand tests around table repository fallback behavior, active table events,
  and owner membership creation.

### Complete Realtime Coverage

- Add realtime refreshes for table lobby members, assignments, paths, codex,
  handouts, loot, markets, and roll logs where useful.
- Ensure subscription cleanup and channel names stay unique across multiple tabs
  and repeated route transitions.
- Add user-facing conflict handling for stale edits in multi-GM sessions.

### Harden Combat

- Expand rules coverage beyond the current attack, damage, healing, status, and
  pending-action loop.
- Add D&D saving throws, area effects, reactions, temporary HP, conditions, and
  richer NPC actions.
- Add NWoD-specific contested actions, defense/armor nuances, damage tracks, and
  condition effects.
- Connect combat-start path outcomes to actual encounter creation/selection.
- Add permission tests for combat declarations and GM-only operations.
- Decide how long to preserve old combat encounter JSON shapes during refactors.

### Finish Path Outcomes

- Wire all path outcomes to concrete app behavior, especially combat start,
  handout reveal, codex unlock, market open, and custom outcomes.
- Add requirement evaluation for inventory, conditions, wallet thresholds,
  node dependencies, and GM unlocks.
- Improve visual path layout beyond list/detail editing.
- Add Supabase realtime and history persistence coverage for path edits and node
  state transitions.

### Deepen Codex Automation

- Implement automated stat mutation for codex `stat_modifier` grants instead of
  creating manual note actions.
- Add prerequisite enforcement or warnings when applying entries to characters.
- Connect codex unlock outcomes from paths and handouts to player-visible entry
  availability.
- Add richer duplicate detection and rollback behavior for add-to-character.

### Improve Rewards, Loot, Handouts, and Markets

- Add more focused tests for reward application across inventory, wallet,
  progression, conditions, codex unlocks, and reward history.
- Complete handout visibility and unlock flows for table-scoped play.
- Add richer market transaction UI, audit trail, and GM controls.
- Validate all reward-state writes under browser GM/player RLS and MCP
  service-role paths.

### Production Readiness

- Audit RLS policies and RPC functions end to end.
- Add broader integration tests for hosted Supabase behavior.
- Add loading, empty, and error states to rough WIP surfaces.
- Add accessibility pass for keyboard navigation, focus order, labels, and
  contrast.
- Improve mobile layouts for dense management pages.
- Decide on a durable migration/backfill strategy for local cached data.
- Add observability around auth failures, realtime failures, and Supabase
  fallback usage.

### Virtual Tabletop Roadmap

- Build map scenes with terrain, tokens, lighting, fog, notes, and GM-only
  overlays.
- Add token management, encounter positioning, targeting from a map, and player
  table views.
- Add session logs, prep notes, lore timelines, faction clocks, quest state, and
  narrative consequences.
- Add AI-assisted prep, NPC generation, handout drafting, session recap, and
  campaign memory while keeping GM control explicit.
