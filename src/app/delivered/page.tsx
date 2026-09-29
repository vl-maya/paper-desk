"use client";

import { TaskBoard } from "@/components/TaskBoard";
import { useTotalDeliveredCount } from "@/lib/store/workspace-store";

export default function DeliveredPage() {
  const total = useTotalDeliveredCount();

  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Delivered ({total})</h2>
      <p className="text-sm text-ink-muted mb-6">Completed work only.</p>
      <TaskBoard direction="all" view="delivered" />
    </div>
  );
}
