# Combat ↔ Character Sheet Alignment

## Problem

Combat UI expects JRPG categories (Fight, Skills, Powers, Items, Defend, Wait, Flee) and auto-resolved attacks via `metadata.combatKind === "attack"` with `attackRoll` + `damageRoll` (D&D) or NWoD check attacks.

Character sheets were built as roll buttons first; many actions lack combat metadata or split attack/damage into separate rows.

## Canonical action metadata

Store on `SheetAction.metadata` (and inventory power actions):

| Field | Purpose |
|-------|---------|
| `combatCategory` | JRPG menu: `fight`, `skill`, `spell`, `power`, `item`, `defend`, `wait`, `flee`, `note`, `utility` |
| `combatKind` | `attack` for auto-resolve in combat, otherwise `utility` |
| `attackRoll` | D&D attack expression (e.g. `1d20+8`) |
| `damageRoll` | D&D damage expression (e.g. `1d8+2`) |
| `damageType` | Optional damage type label |
| `damage` | NWoD weapon damage bonus on `nwod-check` attacks |

Reference template: `src/data/characterImportTemplate.ts` and `docs/character-import-template.json`.

## Runtime migration

`migrateCharacterForCombat()` runs inside `normalizeCharacterProfile()` and `getCombatActionsFromCharacter()`:

- Merges `*-damage` sibling D&D rolls into one fight action
- Infers `combatCategory` when missing
- Sets `combatKind: attack` for fight actions with rolls

## Supabase (`character_profiles`)

MCP `execute_sql` can **read and write** (UPDATE/INSERT). Use `apply_migration` for DDL only.

Remote rows (as of audit):

| id | D&D actions | NWoD actions | Combat metadata |
|----|-------------|--------------|-----------------|
| `bruno-concrete-psalm` | 9 | 6 | Mostly aligned |
| `reverend-of-rats` | 8 | 7 | Missing before migration SQL |

Seed file `he-zhen` is local gallery only until saved to Supabase.

## Re-sync remote characters

After deploying code, either:

1. Run `supabase/migrations/20260602143000_sync_reverend_combat_sheets.sql` (or `npx tsx scripts/export-reverend-sheets-sql.ts` to regenerate), or
2. Open character in app and save (normalization rewrites sheets JSON at runtime even if DB is stale)

Regenerate Reverend SQL: `npx tsx scripts/export-reverend-sheets-sql.ts`
