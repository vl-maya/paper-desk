"use client";

import { TaskBoard } from "@/components/TaskBoard";
import { useWipCounts } from "@/lib/store/workspace-store";
import { WipMeter } from "@/components/WipMeter";
import { FloatingScheduleWidget } from "@/components/schedule/FloatingScheduleWidget";

export default function OutboundPage() {
  const wip = useWipCounts("outbound");
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Outbound tasks</h2>
      <p className="text-sm text-ink-muted mb-4">
        What you are working on now. Backlog and delivered live on their own
        pages.
      </p>
      <div className="max-w-md mb-6">
        <WipMeter label="Outbound WIP" active={wip.active} limit={wip.limit} />
      </div>
      <TaskBoard direction="outbound" view="active" />
      <FloatingScheduleWidget />
    </div>
  );
}
