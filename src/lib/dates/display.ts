import { format, parseISO } from "date-fns";

export const DISPLAY_DATE_FORMAT = "yyyy-MM-dd" as const;
export const DISPLAY_DATETIME_FORMAT = "yyyy-MM-dd HH:mm" as const;

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return parseISO(`${s}T12:00:00`);
  }
  return parseISO(s);
}

/** Calendar dates and titles (ISO `yyyy-MM-dd`). */
export function formatDisplayDate(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`Invalid date: ${String(value)}`);
  }
  return format(d, DISPLAY_DATE_FORMAT);
}

/** Task due/delivery fields: always `yyyy-MM-dd`, or omitted when empty/invalid. */
export function normalizeTaskDateField(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = toDate(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, DISPLAY_DATE_FORMAT);
}

/** Timestamps that include a time of day. */
export function formatDisplayDateTime(value: string | Date): string {
  return format(toDate(value), DISPLAY_DATETIME_FORMAT);
}
