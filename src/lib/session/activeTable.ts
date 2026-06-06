const ACTIVE_TABLE_STORAGE_KEY = "tsr.activeTableId";

export function getActiveTableId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.sessionStorage.getItem(ACTIVE_TABLE_STORAGE_KEY);
  return value && value.trim() ? value.trim() : undefined;
}

export function setActiveTableId(tableId: string | undefined): void {
  if (typeof window === "undefined") return;
  if (!tableId) {
    window.sessionStorage.removeItem(ACTIVE_TABLE_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(ACTIVE_TABLE_STORAGE_KEY, tableId);
}
