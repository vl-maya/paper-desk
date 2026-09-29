"use client";

import { QUERY_TEMPLATES, type QueryTemplateId } from "@/lib/query/mechanical";

export function QueryTemplateChips({
  onSelect,
}: {
  onSelect: (id: QueryTemplateId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUERY_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="rounded-full border border-paper-line bg-card px-3 py-1 text-xs hover:bg-accent/10"
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
