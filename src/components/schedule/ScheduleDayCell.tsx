import { format, isToday } from "date-fns";
import { formatDisplayDate } from "@/lib/dates/display";
import type { TaskTag } from "@/lib/types/schemas";
import { TaskTagPill } from "@/components/TaskTagPill";

export type ScheduleDayItem =
  | { kind: "task"; title: string; sub: string; tagId?: string }
  | { kind: "event"; title: string; sub: string; eventId: string };

const UNTAGGED_KEY = "__untagged__";

type ScheduleDayCellProps = {
  date: Date;
  items: ScheduleDayItem[];
  taskTags: TaskTag[];
  muted?: boolean;
  compact?: boolean;
  /** When false, weekday is omitted (shown in the grid header row instead). */
  showWeekdayInCell?: boolean;
  onEventClick: (eventId: string) => void;
};

function groupTaskItemsByTag(
  tasks: Extract<ScheduleDayItem, { kind: "task" }>[],
  taskTags: TaskTag[],
): { key: string; label?: TaskTag; items: ScheduleDayItem[] }[] {
  const buckets = new Map<string, Extract<ScheduleDayItem, { kind: "task" }>[]>();
  for (const item of tasks) {
    const key = item.tagId ?? UNTAGGED_KEY;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const groups: { key: string; label?: TaskTag; items: ScheduleDayItem[] }[] =
    [];
  const knownIds = new Set(taskTags.map((t) => t.id));

  for (const tag of taskTags) {
    const list = buckets.get(tag.id);
    if (!list?.length) continue;
    groups.push({ key: tag.id, label: tag, items: list });
  }

  for (const [key, list] of buckets) {
    if (key === UNTAGGED_KEY || knownIds.has(key) || !list.length) continue;
    groups.push({
      key,
      label: { id: key, name: "tag", color: "#78716c" },
      items: list,
    });
  }

  const untagged = buckets.get(UNTAGGED_KEY);
  if (untagged?.length) {
    groups.push({ key: UNTAGGED_KEY, items: untagged });
  }
  return groups;
}

export function ScheduleDayCell({
  date,
  items,
  taskTags,
  muted = false,
  compact = false,
  showWeekdayInCell = false,
  onEventClick,
}: ScheduleDayCellProps) {
  const today = isToday(date);
  const dayLabel = formatDisplayDate(date);
  const weekdayLabel = format(date, "EEE");

  function itemKey(item: ScheduleDayItem, index: number): string {
    if (item.kind === "event") return item.eventId;
    return `${item.tagId ?? "none"}-${item.sub}-${item.title}-${index}`;
  }

  const events = items.filter(
    (i): i is Extract<ScheduleDayItem, { kind: "event" }> => i.kind === "event",
  );
  const taskGroups = groupTaskItemsByTag(
    items.filter(
      (i): i is Extract<ScheduleDayItem, { kind: "task" }> => i.kind === "task",
    ),
    taskTags,
  );

  return (
    <div
      className={`paper-card p-2 ${compact ? "min-h-[72px]" : "min-h-[120px]"} ${
        today ? "schedule-day-today" : muted ? "bg-paper/60" : ""
      }`}
    >
      <p
        className={`text-xs font-medium mb-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 ${
          today ? "text-ink" : muted ? "text-ink-muted" : ""
        } ${compact ? "justify-center" : ""}`}
      >
        {showWeekdayInCell && (
          <>
            <span className={today || !muted ? "text-ink-muted" : ""}>
              {weekdayLabel}
            </span>
            <span className="text-ink-muted/70">·</span>
          </>
        )}
        <span className={today ? "font-semibold" : ""}>{dayLabel}</span>
        {today && (
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Today
          </span>
        )}
      </p>
      <div className="space-y-2">
        {taskGroups.map((group) => (
          <div key={group.key}>
            {group.label && (
              <div className={`mb-1 ${compact ? "scale-90 origin-left" : ""}`}>
                <TaskTagPill tag={group.label} />
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item, i) => (
                <li key={itemKey(item, i)} className="text-xs min-w-0 wrap-break-word">
                  <span className="text-ink-muted">{item.sub}</span>
                  <br />
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {events.length > 0 && (
          <div>
            <div className={`mb-1 ${compact ? "scale-90 origin-left" : ""}`}>
              <span
                className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide bg-sky-200 text-sky-950"
                style={{ backgroundColor: "#bae6fd", color: "#0c4a6e" }}
              >
                Events
              </span>
            </div>
            <ul className="space-y-1">
              {events.map((item, i) => (
                <li key={itemKey(item, i)} className="text-xs min-w-0 wrap-break-word">
                  <span className="text-ink-muted">{item.sub}</span>
                  <br />
                  <button
                    type="button"
                    className="text-left hover:underline font-medium wrap-break-word"
                    onClick={() => onEventClick(item.eventId)}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
