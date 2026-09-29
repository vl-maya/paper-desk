"use client";

import { TaskBoard } from "@/components/TaskBoard";
import { useTotalBacklogCount } from "@/lib/store/workspace-store";

export default function BacklogPage() {
  const total = useTotalBacklogCount();

  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Backlog ({total})</h2>
      <p className="text-sm text-ink-muted mb-6">
        Queued work only — nothing here counts toward WIP. Promote when you are
        ready to work an item.
      </p>
      <TaskBoard direction="all" view="backlog" />
    </div>
  );
}
