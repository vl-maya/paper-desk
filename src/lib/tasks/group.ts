import { formatDisplayDate } from "@/lib/dates/display";
import type { SortPreset, Task, TaskStatus, TaskTag } from "@/lib/types/schemas";
import { getTaskTagId } from "@/lib/tasks/tag-display";
import { getUrgencyDisplay } from "@/lib/tasks/urgency-display";
import { sortTasks } from "@/lib/tasks/sort";
import {
  PROGRESS_COLUMN_ORDER,
  TASK_STATUS_LABELS,
} from "@/lib/tasks/status-display";

export type TaskGroupBy =
  | "none"
  | "status"
  | "urgency"
  | "due_date"
  | "delivery_date"
  | "tag";

export type TaskGroup = {
  key: string;
  label: string;
  tasks: Task[];
  tag?: TaskTag;
};

const UNTAGGED_KEY = "__untagged__";

/** Fixed kanban columns when grouping by status (always shown, left → right). */
export const STATUS_COLUMN_ORDER = PROGRESS_COLUMN_ORDER;

function formatDateGroup(iso: string): string {
  try {
    return formatDisplayDate(iso);
  } catch {
    return iso;
  }
}

function groupKeyForDate(iso?: string): string {
  return iso?.slice(0, 10) ?? "__none__";
}

function labelForDate(iso: string | undefined, noneLabel: string): string {
  if (!iso) return noneLabel;
  return formatDateGroup(iso);
}

export function groupTasks(
  tasks: Task[],
  by: TaskGroupBy,
  sort: SortPreset,
  taskTags: TaskTag[] = [],
): TaskGroup[] {
  const sorted = sortTasks(tasks, sort);

  if (by === "none") {
    return [{ key: "all", label: "", tasks: sorted }];
  }

  const buckets = new Map<string, Task[]>();

  for (const task of sorted) {
    let key: string;
    switch (by) {
      case "status":
        key = task.status;
        break;
      case "urgency":
        key = String(task.urgency);
        break;
      case "due_date":
        key = groupKeyForDate(task.dueDate);
        break;
      case "delivery_date":
        key = groupKeyForDate(task.deliveryDate);
        break;
      case "tag":
        key = getTaskTagId(task.tags) ?? UNTAGGED_KEY;
        break;
      default:
        key = "all";
    }
    const list = buckets.get(key) ?? [];
    list.push(task);
    buckets.set(key, list);
  }

  const groups: TaskGroup[] = [];

  if (by === "status") {
    for (const status of STATUS_COLUMN_ORDER) {
      const list = buckets.get(status) ?? [];
      groups.push({
        key: status,
        label: TASK_STATUS_LABELS[status],
        tasks: sortTasks(list, sort),
      });
    }
    const delivered = buckets.get("done");
    if (delivered?.length) {
      groups.push({
        key: "done",
        label: "Delivered",
        tasks: sortTasks(delivered, sort),
      });
    }
    return groups;
  }

  if (by === "urgency") {
    for (let u = 5; u >= 1; u--) {
      const list = buckets.get(String(u));
      if (!list?.length) continue;
      const tone = getUrgencyDisplay(u);
      groups.push({
        key: String(u),
        label: `Urgency ${u} · ${tone.label}`,
        tasks: sortTasks(list, sort),
      });
    }
    return groups;
  }

  if (by === "due_date" || by === "delivery_date") {
    const noneLabel =
      by === "due_date" ? "No due date" : "No delivery date";
    const datedKeys = [...buckets.keys()]
      .filter((k) => k !== "__none__")
      .sort();
    for (const key of datedKeys) {
      const list = buckets.get(key);
      if (!list?.length) continue;
      const sample = list[0];
      const iso =
        by === "due_date" ? sample?.dueDate : sample?.deliveryDate;
      groups.push({
        key,
        label: labelForDate(iso, noneLabel),
        tasks: sortTasks(list, sort),
      });
    }
    const noneList = buckets.get("__none__");
    if (noneList?.length) {
      groups.push({
        key: "__none__",
        label: noneLabel,
        tasks: sortTasks(noneList, sort),
      });
    }
    return groups;
  }

  if (by === "tag") {
    const knownIds = new Set(taskTags.map((t) => t.id));
    for (const tag of taskTags) {
      const list = buckets.get(tag.id);
      if (!list?.length) continue;
      groups.push({
        key: tag.id,
        label: tag.name,
        tag,
        tasks: sortTasks(list, sort),
      });
    }
    for (const [key, list] of buckets) {
      if (key === UNTAGGED_KEY || knownIds.has(key) || !list.length) continue;
      groups.push({
        key,
        label: "Unknown tag",
        tasks: sortTasks(list, sort),
      });
    }
    const untagged = buckets.get(UNTAGGED_KEY);
    if (untagged?.length) {
      groups.push({
        key: UNTAGGED_KEY,
        label: "No task type",
        tasks: sortTasks(untagged, sort),
      });
    }
    return groups;
  }

  return [{ key: "all", label: "", tasks: sorted }];
}
