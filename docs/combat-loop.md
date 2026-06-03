# Combat loop (UI)

## Flow phases

`deriveCombatFlowPhase()` in `src/lib/combat/combatFlow.ts` drives step hints:

1. **targeting** — pick a target (player: Target panel only; enemy field is display-only)
2. **target_ready** — choose Fight / Skills / etc.
3. **pending** — player declared; GM resolves or clears
4. **resolved** — last resolve feedback (until target changes)

## Player path

Select target → Command menu → Declare → status banner + combat log entry → GM **Resolve pending** (rolls attack vs AC, applies damage).

## GM path

GM mode uses the same RPGM shell as players (`RpgCombatShell` + `CommandMenu` in `mode="gm"`), plus:

- Turn toolbar (end / next turn)
- Resolve / roll buttons on the command confirm step
- Pending action panel with **Resolve pending**
- Collapsible roster (manual damage, heal, status, make active)

Select target → **Resolve** on an attack, or **Resolve pending** when a player declaration exists.

Turn controls require an **active** encounter (use **Start Encounter** in the header while in draft). **End Turn** / **Next Turn** advance initiative and clear stale pending actions.

Players use **End My Turn** on the Player tab when it is their combatant's initiative; this logs the pass and advances to the next combatant (same as GM end turn).

## Combat log

Header **Combat Log** opens a side drawer with full `actionHistory` (newest first). GM mode still shows a short inline preview with “Open full log”.

## Tests

`npm run test` includes `resolveCombatAction.test.ts` (hit, miss, nat 1, pending resolve).
