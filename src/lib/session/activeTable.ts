const ACTIVE_TABLE_STORAGE_KEY = "tsr.activeTableId";
const ACTIVE_TABLE_EVENT = "dicer:active-table-change";

export function subscribeActiveTableChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ACTIVE_TABLE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ACTIVE_TABLE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getActiveTableId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.sessionStorage.getItem(ACTIVE_TABLE_STORAGE_KEY);
  return value && value.trim() ? value.trim() : undefined;
}

export function setActiveTableId(tableId: string | undefined): void {
  if (typeof window === "undefined") return;
  if (!tableId) {
    window.sessionStorage.removeItem(ACTIVE_TABLE_STORAGE_KEY);
    window.dispatchEvent(new Event(ACTIVE_TABLE_EVENT));
    return;
  }
  window.sessionStorage.setItem(ACTIVE_TABLE_STORAGE_KEY, tableId);
  window.dispatchEvent(new Event(ACTIVE_TABLE_EVENT));
}
