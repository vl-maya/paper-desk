import type { ScheduleEvent } from "@/lib/types/schemas";

export type EventsListFilter = "active" | "archived";

export function eventIsArchived(event: Pick<ScheduleEvent, "archived">): boolean {
  return event.archived ?? false;
}

export function filterEventsByList(
  events: ScheduleEvent[],
  filter: EventsListFilter,
): ScheduleEvent[] {
  return events.filter((e) =>
    filter === "archived" ? eventIsArchived(e) : !eventIsArchived(e),
  );
}

export function filterEventsBySearch(
  events: ScheduleEvent[],
  query: string,
): ScheduleEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((e) => {
    if (e.title.toLowerCase().includes(q)) return true;
    return e.notes ? e.notes.toLowerCase().includes(q) : false;
  });
}

export function eventsByStartDesc(events: ScheduleEvent[]): ScheduleEvent[] {
  return [...events].sort((a, b) => b.start.localeCompare(a.start));
}
