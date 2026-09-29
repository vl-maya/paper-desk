import type { TaskTag } from "@/lib/types/schemas";
import { taskTagPillStyle } from "@/lib/tasks/tag-display";

export function TaskTagPill({ tag }: { tag: TaskTag }) {
  return (
    <span
      className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={taskTagPillStyle(tag.color)}
    >
      {tag.name}
    </span>
  );
}
