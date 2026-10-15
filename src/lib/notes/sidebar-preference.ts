export const NOTES_SIDEBAR_COLLAPSED_KEY = "paper-desk.notes.sidebarCollapsed";

export function readNotesSidebarCollapsedFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NOTES_SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeNotesSidebarCollapsedToStorage(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOTES_SIDEBAR_COLLAPSED_KEY,
    collapsed ? "true" : "false",
  );
}
