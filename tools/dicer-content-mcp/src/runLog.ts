import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DicerContentConfig } from "./config";

export async function writeRunLog(
  config: Pick<DicerContentConfig, "runDir">,
  runId: string,
  payload: unknown
): Promise<string> {
  await mkdir(config.runDir, { recursive: true });
  const filePath = path.join(config.runDir, `${safeFileName(runId)}.json`);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
