import type { TaskStatus } from "@/lib/types/schemas";
import {
  TASK_STATUS_BADGE_STYLES,
  TASK_STATUS_LABELS,
} from "@/lib/tasks/status-display";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-ink ${TASK_STATUS_BADGE_STYLES[status]}`}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
