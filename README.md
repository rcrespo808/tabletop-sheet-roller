# Tabletop Sheet Roller

Small local MVP for viewing custom tabletop character sheets and rolling prepared or manual dice actions.

## Goal

This app supports a fast first iteration:

- Character gallery
- Character sheet image viewer
- Prepared action buttons
- Manual D&D 5e and NWoD dice rolling
- Local browser-session roll log
- Optional Supabase persistence and Auth for owned character libraries

## Run Locally

Install dependencies, then start the Next.js dev server:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deployment

Vercel deploys the app through its GitHub integration. GitHub Actions run CI checks and can apply Supabase migrations to the existing Supabase project.

See `docs/deployment.md` for required GitHub/Vercel secrets and migration workflow details.

## Supported Dice

D&D 5e manual rolls support:

- `XdY`
- `XdY+Z`
- `XdY-Z`
- `d20+5`
- Flat modifiers such as `5` or `-1`

NWoD rolls support:

- d10 dice pools
- Successes on 8+
- 10-again by default
- Optional 9-again, 8-again, or no-again
- Rote rerolls of failed dice once
- Chance die with dramatic failure on 1 and success on 10

## Seed Characters

- He Zhen — one profile with D&D 5e and NWoD system sheets (`/characters/he-zhen`)
- Legacy `/characters/he-zhen-nwod` redirects to He Zhen with the NWoD tab selected

Sheet image paths are placeholders. Missing images show a fallback panel instead of crashing.

## MVP Limitations

- Roll log and characters fall back to local browser storage when Supabase is unavailable.
- Seed characters are hardcoded in `src/data/characters.ts`.
- Sheet images are static files only.
- No editable structured sheets yet.
- Table membership and GM/player roles have database foundations, but no full table-management UI yet.

## Next Iteration

Room-based realtime logs are the next useful step. Supabase Realtime or PartyKit would both fit the current model without forcing a full account system immediately.

## Persistence Milestone (Supabase)

Suggested next implementation steps:

1. Enable email confirmation and, optionally, Google OAuth in Supabase Auth.
2. Apply the migrations in `supabase/migrations`.
3. Build table-management UI on top of `game_tables` and `game_table_members`.
4. Subscribe to realtime room timelines for shared roll logs.
5. Add integration tests for DTO mapping and migration smoke checks in CI.
