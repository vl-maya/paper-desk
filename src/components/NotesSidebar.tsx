"use client";

import type { NoteMeta } from "@/lib/types/schemas";
import { safeFormatDisplayDate } from "@/lib/dates/display";

export type NotesSidebarProps = {
  notes: NoteMeta[];
  selectedTitle: string | null;
  onSelectNote: (title: string, noteId: string) => void;
  onCreateNote: () => void;
};

export function NotesSidebar({
  notes,
  selectedTitle,
  onSelectNote,
  onCreateNote,
}: NotesSidebarProps) {
  return (
    <aside className="w-full lg:w-56 shrink-0">
      <button
        type="button"
        className="w-full rounded bg-accent text-white text-sm py-2 mb-3 font-medium transition-colors hover:bg-accent/90"
        onClick={onCreateNote}
      >
        New note
      </button>
      <ul className="space-y-1">
        {notes.map((n) => {
          const createdDate = safeFormatDisplayDate(n.createdAt);
          const isSelected = selectedTitle === n.title;

          return (
            <li key={n.id}>
              <button
                type="button"
                className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                  isSelected ? "bg-accent/15" : "hover:bg-paper-line/50"
                }`}
                onClick={() => onSelectNote(n.title, n.id)}
              >
                <span className="block text-sm font-medium truncate text-ink">
                  {n.title}
                </span>
                {createdDate && (
                  <span
                    className="block text-xs text-ink-muted mt-0.5"
                    title={n.createdAt}
                  >
                    {createdDate}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
