export const DEFAULT_SUPABASE_PROJECT_REF = "toogirtxlnsbtvmqcqgw";

export const WRITABLE_TABLES = [
  "codex_entries",
  "loot_tables",
  "handouts",
  "markets",
  "character_profiles",
  "combat_encounters",
  "roll_logs",
  "market_transactions"
] as const;

export type WritableTable = (typeof WRITABLE_TABLES)[number];

export const JSON_TARGETS: Record<WritableTable, readonly string[]> = {
  codex_entries: ["action_template", "grants", "prerequisites", "metadata"],
  loot_tables: ["entries"],
  handouts: ["reward_payloads"],
  markets: ["stores", "metadata"],
  character_profiles: [
    "sheets",
    "inventory",
    "wallet",
    "reward_history",
    "progression",
    "conditions"
  ],
  combat_encounters: ["combatants"],
  roll_logs: ["details"],
  market_transactions: ["item", "price"]
};

export const STATEFUL_JSON_TABLES = [
  "character_profiles",
  "combat_encounters",
  "roll_logs",
  "market_transactions"
] as const satisfies readonly WritableTable[];

export const UUID_TABLES = [
  "codex_entries",
  "loot_tables",
  "handouts",
  "markets",
  "combat_encounters",
  "market_transactions"
] as const satisfies readonly WritableTable[];

export const TABLE_SELECT_COLUMNS: Record<WritableTable, string> = {
  codex_entries:
    "id,campaign_id,system,type,name,subtitle,description,rules_text,tags,visibility,action_template,grants,prerequisites,source_label,metadata,created_by,created_at,updated_at",
  loot_tables:
    "id,campaign_id,name,description,visibility,entries,created_by,created_at,updated_at",
  handouts:
    "id,game_table_id,title,subtitle,body,image_url,attachment_url,visibility,selected_player_ids,tags,reward_payloads,codex_entry_ids,revealed_at,created_by,created_at,updated_at",
  markets:
    "id,game_table_id,name,description,location,status,stores,metadata,created_by,opened_at,closed_at,created_at,updated_at",
  character_profiles:
    "id,owner_user_id,owner_label,character_kind,game_table_id,name,subtitle,concept,portrait_image,default_system,sheets,inventory,wallet,reward_history,progression,conditions,created_at,updated_at",
  combat_encounters:
    "id,game_table_id,version,name,system,round,turn_index,status,combatants,created_by,created_at,updated_at",
  roll_logs:
    "id,room_slug,character_id,character_name,system,kind,action_label,expression,result_text,details,created_at",
  market_transactions:
    "id,market_id,store_id,character_id,user_id,type,item_name,item,quantity,price,created_at"
};

export const TABLE_REQUIRED_COLUMNS: Record<WritableTable, readonly string[]> = {
  codex_entries: ["id", "system", "type", "name", "description", "visibility"],
  loot_tables: ["id", "campaign_id", "name", "visibility", "entries"],
  handouts: ["id", "game_table_id", "title", "visibility", "tags", "reward_payloads"],
  markets: ["id", "game_table_id", "name", "status", "stores"],
  character_profiles: ["id", "name", "default_system", "sheets"],
  combat_encounters: ["id", "name", "system", "round", "turn_index", "status", "combatants"],
  roll_logs: ["id", "room_slug", "kind", "result_text"],
  market_transactions: [
    "id",
    "market_id",
    "store_id",
    "character_id",
    "type",
    "item_name",
    "quantity",
    "price"
  ]
};

export const CONTENT_GENERATOR_NAME = "dicer-content-mcp";
