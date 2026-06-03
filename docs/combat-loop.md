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

Select target → **Resolve** on an attack, or **Resolve pending** when a player declaration exists.

## Combat log

Header **Combat Log** opens a side drawer with full `actionHistory` (newest first). GM mode still shows a short inline preview with “Open full log”.

## Tests

`npm run test` includes `resolveCombatAction.test.ts` (hit, miss, nat 1, pending resolve).
