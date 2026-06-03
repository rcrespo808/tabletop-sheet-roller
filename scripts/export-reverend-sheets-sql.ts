import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { reverendOfRatsProfile } from "../src/data/reverend-of-rats";
import { migrateCharacterForCombat } from "../src/lib/sheets/sheetActionCombat";

const migrated = migrateCharacterForCombat(reverendOfRatsProfile);
const sheetsJson = JSON.stringify(migrated.sheets);
const escaped = sheetsJson.replace(/'/g, "''");

const sql = `-- Sync reverend-of-rats sheets with combat-aligned metadata (generated)
update public.character_profiles
set
  sheets = '${escaped}'::jsonb,
  updated_at = now()
where id = 'reverend-of-rats';
`;

const outPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260602143000_sync_reverend_combat_sheets.sql"
);
writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${sheetsJson.length} bytes JSON)`);
