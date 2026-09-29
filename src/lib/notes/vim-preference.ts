export const VIM_ENABLED_STORAGE_KEY = "paper-desk.notes.vimEnabled";

export function readVimEnabledFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(VIM_ENABLED_STORAGE_KEY);
    if (raw === null) return false;
    return raw === "true" || JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

export function writeVimEnabledToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIM_ENABLED_STORAGE_KEY, enabled ? "true" : "false");
}
