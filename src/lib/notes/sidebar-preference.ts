export const NOTES_SIDEBAR_COLLAPSED_KEY = "paper-desk.notes.sidebarCollapsed";
export const NOTES_SIDEBAR_PANEL_ID = "notes-sidebar";

const SIDEBAR_COLLAPSED_CHANGE_EVENT = "paper-desk:notes-sidebar-collapsed";

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
  try {
    window.localStorage.setItem(
      NOTES_SIDEBAR_COLLAPSED_KEY,
      collapsed ? "true" : "false",
    );
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
  } catch {
    // Ignore quota / private mode errors; in-memory subscription still runs below.
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
  }
}

export function subscribeNotesSidebarCollapsed(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();

  const onStorage = (event: StorageEvent) => {
    if (event.key === NOTES_SIDEBAR_COLLAPSED_KEY || event.key === null) {
      onChange();
    }
  };

  window.addEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleNotesSidebarCollapsedInStorage(): boolean {
  const next = !readNotesSidebarCollapsedFromStorage();
  writeNotesSidebarCollapsedToStorage(next);
  return next;
}
