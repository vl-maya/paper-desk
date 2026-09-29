import { formatDisplayDate } from "@/lib/dates/display";

/** Filesystem-safe note markdown basename (no extension). */
export function sanitizeNoteFileName(title: string): string {
  const safe = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\0/g, "")
    .trim();
  return safe || "untitled";
}

/** Kebab-case slug suitable for note titles and `/notes?title=` URLs. */
export function slugifyNoteTitle(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

/** Unique kebab title among `takenTitles` (slugifies `raw` first). */
export function uniqueNoteTitle(raw: string, takenTitles: string[]): string {
  const taken = new Set(takenTitles);
  const base = slugifyNoteTitle(raw);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Title for a new note: today's date (`yyyy-MM-dd`), with `-2`, `-3`, … if taken. */
export function defaultNoteTitle(
  existingTitles: string[],
  date = new Date(),
): string {
  const base = formatDisplayDate(date);
  const taken = new Set(existingTitles);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
