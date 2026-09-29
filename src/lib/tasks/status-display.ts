import type { TaskStatus } from "@/lib/types/schemas";

/** Open workflow columns on the board (left → right). */
export const PROGRESS_COLUMN_ORDER = [
  "todo",
  "in_progress",
  "testing",
  "blocked",
  "delayed",
] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  testing: "Testing",
  blocked: "Blocked",
  delayed: "Delayed",
  done: "Delivered",
};

export const TASK_STATUS_BADGE_STYLES: Record<TaskStatus, string> = {
  todo: "bg-stone-200/80",
  in_progress: "bg-amber-100",
  testing: "bg-sky-100",
  blocked: "bg-red-100",
  delayed: "bg-orange-100",
  done: "bg-emerald-100",
};

/** Status picker options in workflow order. */
export const TASK_STATUS_SELECT_ORDER: TaskStatus[] = [
  ...PROGRESS_COLUMN_ORDER,
  "done",
];
