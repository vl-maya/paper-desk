import type { NoteMeta, NoteTag } from "@/lib/types/schemas";

export type NotesListFilter = "active" | "archived";

export function noteIsArchived(note: Pick<NoteMeta, "archived">): boolean {
  return note.archived ?? false;
}

export function filterNotesByList(
  notes: NoteMeta[],
  filter: NotesListFilter,
): NoteMeta[] {
  return notes.filter((n) =>
    filter === "archived" ? noteIsArchived(n) : !noteIsArchived(n),
  );
}

function tagNamesForNote(
  note: NoteMeta,
  noteTags: NoteTag[] | undefined,
): string[] {
  if (!noteTags?.length || !note.tagIds?.length) return [];
  const byId = new Map(noteTags.map((t) => [t.id, t.name]));
  return note.tagIds
    .map((id) => byId.get(id))
    .filter((name): name is string => Boolean(name));
}

export function filterNotesBySearch(
  notes: NoteMeta[],
  query: string,
  bodies?: Record<string, string>,
  noteTags?: NoteTag[],
): NoteMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((n) => {
    if (n.title.toLowerCase().includes(q)) return true;
    const body = bodies?.[n.id];
    if (body?.toLowerCase().includes(q)) return true;
    return tagNamesForNote(n, noteTags).some((name) =>
      name.toLowerCase().includes(q),
    );
  });
}

/** Match notes for API search (title, body, assigned tag names). */
export function noteMatchesSearchQuery(
  note: NoteMeta,
  q: string,
  body: string,
  noteTags: NoteTag[],
): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (note.title.toLowerCase().includes(lower)) return true;
  if (body.toLowerCase().includes(lower)) return true;
  return tagNamesForNote(note, noteTags).some((name) =>
    name.toLowerCase().includes(lower),
  );
}
