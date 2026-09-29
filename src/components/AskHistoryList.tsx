"use client";

import { useState } from "react";
import { formatDisplayDateTime } from "@/lib/dates/display";
import type { AskHistoryEntry, Settings } from "@/lib/types/schemas";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import {
  groupAskHistoryByDay,
  type AskHistoryFilter,
} from "@/lib/ask/groupHistory";
import { AskAnswerMarkdown } from "@/components/AskAnswerMarkdown";
import { resolveModelLabel } from "@/lib/ai/providers";

function sourceLabel(
  entry: AskHistoryEntry,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): string {
  if (entry.source === "mechanical") {
    return "Mechanical (no tokens)";
  }
  const provider = entry.provider === "cursor" ? "Cursor" : "Claude";
  const modelLabel = resolveModelLabel(
    entry.provider === "cursor" ? "cursor" : "claude",
    entry.model,
    settings,
  );
  return `CLI AI · ${provider} / ${modelLabel}`;
}

export function AskHistoryList({
  entries,
  settings,
  filter = "active",
  onArchive,
  onDelete,
}: {
  entries: AskHistoryEntry[];
  settings?: Pick<Settings, "aiSelectableModels"> | null;
  filter?: AskHistoryFilter;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const groups = groupAskHistoryByDay(entries, filter);
  const isArchiveView = filter === "archived";
  const [pendingDelete, setPendingDelete] = useState<AskHistoryEntry | null>(
    null,
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm text-ink-muted mt-8">
        {isArchiveView
          ? "No archived responses. Archive items from Ask desk to hide them from your main history."
          : "No responses yet. Ask a question or use a template chip above."}
      </p>
    );
  }

  return (
    <section className="mt-10 space-y-8">
      <h3 className="font-serif text-lg">
        {isArchiveView ? "Archived responses" : "History"}
      </h3>
      {groups.map((group) => (
        <div key={group.dayKey}>
          <h4 className="text-sm font-medium text-ink-muted mb-3 sticky top-0 bg-paper/95 py-1 backdrop-blur-sm">
            {group.dayLabel}
          </h4>
          <ul className="space-y-4">
            {group.entries.map((entry) => {
              const status = entry.status ?? "completed";
              const isRunning = status === "running";
              const isFailed = status === "failed";
              return (
              <li key={entry.id} className="paper-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-ink line-clamp-2">
                    {entry.prompt}
                  </p>
                  {isArchiveView && onDelete ? (
                    <button
                      type="button"
                      className="text-xs text-red-800 underline shrink-0 hover:text-red-950"
                      onClick={() => setPendingDelete(entry)}
                    >
                      Delete
                    </button>
                  ) : onArchive && !isRunning ? (
                    <button
                      type="button"
                      className="text-xs text-ink-muted underline shrink-0 hover:text-ink"
                      onClick={() => onArchive(entry.id)}
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-ink-muted mb-3">
                  {formatDisplayDateTime(entry.respondedAt)} ·{" "}
                  <span
                    className={
                      entry.source === "mechanical"
                        ? "text-emerald-800"
                        : undefined
                    }
                  >
                    {sourceLabel(entry, settings)}
                  </span>
                  {isRunning ? (
                    <span className="ml-2 text-accent">· Generating…</span>
                  ) : null}
                </p>
                {isFailed && entry.errorMessage ? (
                  <p className="text-sm text-red-800 mb-3" role="alert">
                    {entry.errorMessage}
                  </p>
                ) : null}
                {entry.answer ? (
                  <AskAnswerMarkdown content={entry.answer} />
                ) : isRunning ? (
                  <p className="text-sm text-ink-muted animate-pulse">
                    Waiting for response…
                  </p>
                ) : null}
              </li>
            );
            })}
          </ul>
        </div>
      ))}
      {onDelete && pendingDelete && (
        <ConfirmDeleteModal
          open={pendingDelete !== null}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => onDelete(pendingDelete.id)}
          title="Delete response?"
          description="This archived response will be permanently removed."
          itemLabel={pendingDelete.prompt}
        />
      )}
    </section>
  );
}
