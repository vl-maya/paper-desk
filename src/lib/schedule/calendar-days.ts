import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatDisplayDate } from "@/lib/dates/display";

export type ScheduleViewMode = "weekly" | "monthly";

export const WEEK_STARTS_ON = 1 as const;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function getVisibleDays(mode: ScheduleViewMode, anchorDate: Date): Date[] {
  if (mode === "weekly") {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }
  const monthStart = startOfMonth(anchorDate);
  const start = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end });
}

export function formatPeriodLabel(mode: ScheduleViewMode, anchorDate: Date): string {
  if (mode === "weekly") {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
    return `Week of ${formatDisplayDate(weekStart)}`;
  }
  return formatDisplayDate(startOfMonth(anchorDate));
}

export function shiftAnchorDate(
  mode: ScheduleViewMode,
  anchorDate: Date,
  direction: -1 | 1,
): Date {
  if (mode === "weekly") {
    return addWeeks(anchorDate, direction);
  }
  return addMonths(anchorDate, direction);
}

export function getMonthStartForAnchor(anchorDate: Date): Date {
  return startOfMonth(anchorDate);
}
