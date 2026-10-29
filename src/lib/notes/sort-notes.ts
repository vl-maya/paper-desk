import type { NoteMeta } from "@/lib/types/schemas";

export function compareNotesByTitleAsc(a: NoteMeta, b: NoteMeta): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

export function notesByTitleAsc(notes: NoteMeta[]): NoteMeta[] {
  return [...notes].sort(compareNotesByTitleAsc);
}
