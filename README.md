# Tabletop Sheet Roller

Small local MVP for viewing custom tabletop character sheets and rolling prepared or manual dice actions.

## Goal

This app supports a fast first iteration:

- Character gallery
- Character sheet image viewer
- Prepared action buttons
- Manual D&D 5e and NWoD dice rolling
- Local browser-session roll log

There is no backend, auth, persistence, or multiplayer in this version.

## Run Locally

Install dependencies, then start the Next.js dev server:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

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

- He Zhen, D&D 5e
- He Zhen NWoD

Sheet image paths are placeholders. Missing images show a fallback panel instead of crashing.

## MVP Limitations

- Roll log is local React state and clears on refresh.
- Characters are hardcoded in `src/data/characters.ts`.
- Sheet images are static files only.
- No editable structured sheets yet.
- No shared rooms or realtime table log.

## Next Iteration

Room-based realtime logs are the next useful step. Supabase Realtime or PartyKit would both fit the current model without forcing a full account system immediately.
