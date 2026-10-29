import type { NoteMeta, NoteTag } from "@/lib/types/schemas";
import { notesByTitleAsc } from "@/lib/notes/sort-notes";

export type NoteTagGroup = {
  key: string;
  label: string;
  tag?: NoteTag;
  notes: NoteMeta[];
};

const UNTAGGED_KEY = "__untagged__";

export function noteHasAnyTag(note: NoteMeta): boolean {
  return (note.tagIds?.length ?? 0) > 0;
}

export function groupNotesByTags(
  notes: NoteMeta[],
  noteTags: NoteTag[],
): NoteTagGroup[] {
  const buckets = new Map<string, NoteMeta[]>();
  for (const note of notes) {
    const ids = note.tagIds ?? [];
    if (ids.length === 0) {
      const list = buckets.get(UNTAGGED_KEY) ?? [];
      list.push(note);
      buckets.set(UNTAGGED_KEY, list);
      continue;
    }
    for (const tagId of ids) {
      const list = buckets.get(tagId) ?? [];
      list.push(note);
      buckets.set(tagId, list);
    }
  }

  const groups: NoteTagGroup[] = [];
  for (const tag of noteTags) {
    const list = buckets.get(tag.id);
    if (!list?.length) continue;
    groups.push({
      key: tag.id,
      label: tag.name,
      tag,
      notes: notesByTitleAsc(list),
    });
  }

  const untagged = buckets.get(UNTAGGED_KEY);
  if (untagged?.length) {
    groups.push({
      key: UNTAGGED_KEY,
      label: "Untagged",
      notes: notesByTitleAsc(untagged),
    });
  }

  return groups;
}
