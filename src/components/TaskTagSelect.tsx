"use client";

import type { TaskTag } from "@/lib/types/schemas";
import { TaskTagPill } from "./TaskTagPill";

export function TaskTagSelect({
  tags,
  value,
  onChange,
  className,
}: {
  tags: TaskTag[];
  value?: string;
  onChange: (tagId: string | undefined) => void;
  className?: string;
}) {
  const selected = value ? tags.find((t) => t.id === value) : undefined;

  return (
    <div className={className}>
      <select
        className="w-full border border-paper-line rounded px-2 py-1.5 bg-card"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? e.target.value : undefined)
        }
      >
        <option value="">No tag</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {selected && (
        <div className="mt-2">
          <TaskTagPill tag={selected} />
        </div>
      )}
    </div>
  );
}
