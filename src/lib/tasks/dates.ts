import {
  addDays,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  formatDisplayDate,
  normalizeTaskDateField,
} from "@/lib/dates/display";

export type DueDateKind = "none" | "overdue" | "today" | "soon" | "later";

export function getDueDateKind(
  dueDate?: string,
  soonWithinDays = 3,
): DueDateKind {
  if (!dueDate) return "none";
  const d = startOfDay(parseISO(dueDate));
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (isSameDay(d, today)) return "today";
  const soonEnd = addDays(today, soonWithinDays);
  if (!isBefore(soonEnd, d)) return "soon";
  return "later";
}

export function formatTaskDate(isoDate: string): string {
  return (
    normalizeTaskDateField(isoDate) ??
    (isoDate.length >= 10 ? isoDate.slice(0, 10) : formatDisplayDate(isoDate))
  );
}

export function isDeliveryPassed(
  deliveryDate?: string,
  status?: string,
): boolean {
  if (!deliveryDate || status === "done") return false;
  const delivery = startOfDay(parseISO(deliveryDate));
  const today = startOfDay(new Date());
  return isBefore(delivery, today);
}
