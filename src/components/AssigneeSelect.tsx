"use client";

import type { Assignee } from "@/lib/types/schemas";

export function AssigneeSelect({
  assignees,
  value,
  onChange,
  className,
}: {
  assignees: Assignee[];
  value?: string;
  onChange: (id: string | undefined) => void;
  className?: string;
}) {
  return (
    <select
      className={
        className ??
        "w-full border border-paper-line rounded px-2 py-1.5 text-sm bg-card"
      }
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">Unassigned</option>
      {assignees.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
