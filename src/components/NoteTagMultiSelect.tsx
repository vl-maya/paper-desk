"use client";

import type { NoteTag } from "@/lib/types/schemas";
import { tagPillStyle } from "@/lib/tasks/tag-display";

export function NoteTagMultiSelect({
  tags,
  value,
  onChange,
  className,
}: {
  tags: NoteTag[];
  value: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}) {
  if (tags.length === 0) {
    return (
      <p className={`text-xs text-ink-muted ${className ?? ""}`}>
        No note tags yet. Add tags in Settings.
      </p>
    );
  }

  const selected = new Set(value);

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
        Tags
      </p>
      <ul className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isOn = selected.has(tag.id);
          return (
            <li key={tag.id}>
              <button
                type="button"
                aria-pressed={isOn}
                className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide border transition-opacity ${
                  isOn ? "border-transparent opacity-100" : "border-paper-line opacity-50"
                }`}
                style={isOn ? tagPillStyle(tag.color) : undefined}
                onClick={() => {
                  const next = new Set(selected);
                  if (isOn) next.delete(tag.id);
                  else next.add(tag.id);
                  onChange([...next]);
                }}
              >
                {tag.name}
              </button>
            </li>
          );
        })}
      </ul>
      {value.length === 0 && (
        <p className="text-xs text-ink-muted mt-2">No tags selected.</p>
      )}
    </div>
  );
}
