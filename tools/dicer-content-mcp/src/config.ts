import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { DEFAULT_SUPABASE_PROJECT_REF } from "./constants";

export type DicerContentConfig = {
  cwd: string;
  supabaseUrl?: string;
  serviceRoleKey?: string;
  serviceRoleKeyKind?: "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY";
  databaseUrl?: string;
  projectRef: string;
  openAiApiKey?: string;
  model: string;
  runDir: string;
};

function loadEnvFile(cwd: string, filename: string) {
  const envPath = path.join(cwd, filename);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false, quiet: true });
  }
}

export function loadDicerContentConfig(cwd = process.cwd()): DicerContentConfig {
  loadEnvFile(cwd, ".env.local");
  loadEnvFile(cwd, ".env");

  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKeyKind = process.env.SUPABASE_SECRET_KEY
    ? "SUPABASE_SECRET_KEY"
    : process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : undefined;

  return {
    cwd,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    serviceRoleKey,
    serviceRoleKeyKind,
    databaseUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
    projectRef: process.env.SUPABASE_PROJECT_ID || DEFAULT_SUPABASE_PROJECT_REF,
    openAiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.DICER_CONTENT_MODEL || "gpt-5.5",
    runDir:
      process.env.DICER_CONTENT_RUN_DIR ||
      path.join(cwd, ".tools", "dicer-content-mcp", "runs")
  };
}

export function assertSupabaseConfigured(config: DicerContentConfig): asserts config is DicerContentConfig & {
  supabaseUrl: string;
  serviceRoleKey: string;
} {
  if (!config.supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required for Supabase access.");
  }

  if (!config.serviceRoleKey) {
    throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for cloud writes.");
  }
}

export function assertDatabaseConfigured(config: DicerContentConfig): asserts config is DicerContentConfig & {
  databaseUrl: string;
} {
  if (!config.databaseUrl) {
    throw new Error("SUPABASE_DB_URL or DATABASE_URL is required for execute_sql.");
  }
}

export function assertOpenAiConfigured(config: DicerContentConfig): asserts config is DicerContentConfig & {
  openAiApiKey: string;
} {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required for generate_content_pack.");
  }
}

export function assertProjectConfirmation(confirmProjectRef: string | undefined, expectedProjectRef: string) {
  if (!confirmProjectRef) {
    throw new Error(`confirmProjectRef must be set to ${expectedProjectRef} before cloud writes.`);
  }

  if (confirmProjectRef !== expectedProjectRef) {
    throw new Error(
      `Project confirmation mismatch. Received ${confirmProjectRef}; expected ${expectedProjectRef}.`
    );
  }
}

export function getSupabaseHost(config: Pick<DicerContentConfig, "supabaseUrl">): string | undefined {
  if (!config.supabaseUrl) return undefined;
  try {
    return new URL(config.supabaseUrl).host;
  } catch {
    return undefined;
  }
}
