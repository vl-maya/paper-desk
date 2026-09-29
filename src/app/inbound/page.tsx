"use client";

import { TaskBoard } from "@/components/TaskBoard";
import { useDirectionActiveCount, useWipCounts } from "@/lib/store/workspace-store";
import { WipMeter } from "@/components/WipMeter";

export default function InboundPage() {
  const wip = useWipCounts("inbound");
  const active = useDirectionActiveCount("inbound");
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Inbound ({active})</h2>
      <p className="text-sm text-ink-muted mb-4">
        What you are working on now. Backlog and delivered live on their own
        pages.
      </p>
      <div className="max-w-md mb-6">
        <WipMeter label="Inbound WIP" active={wip.active} limit={wip.limit} />
      </div>
      <TaskBoard direction="inbound" view="active" />
    </div>
  );
}
