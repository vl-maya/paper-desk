import { parseISO } from "date-fns";
import { formatDisplayDate } from "@/lib/dates/display";
import type { AskHistoryEntry } from "@/lib/types/schemas";

export type AskHistoryDayGroup = {
  dayKey: string;
  dayLabel: string;
  entries: AskHistoryEntry[];
};

function dayKeyFromIso(iso: string): string {
  return formatDisplayDate(parseISO(iso));
}

export type AskHistoryFilter = "active" | "archived";

export function groupAskHistoryByDay(
  entries: AskHistoryEntry[],
  filter: AskHistoryFilter = "active",
): AskHistoryDayGroup[] {
  const active = entries.filter((e) =>
    filter === "archived" ? e.archived : !e.archived,
  );
  const sorted = [...active].sort(
    (a, b) =>
      new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime(),
  );

  const dayOrder: string[] = [];
  const byDay = new Map<string, AskHistoryEntry[]>();

  for (const entry of sorted) {
    const key = dayKeyFromIso(entry.respondedAt);
    if (!byDay.has(key)) {
      byDay.set(key, []);
      dayOrder.push(key);
    }
    byDay.get(key)!.push(entry);
  }

  return dayOrder.map((dayKey) => ({
    dayKey,
    dayLabel: dayKey,
    entries: byDay.get(dayKey)!,
  }));
}
