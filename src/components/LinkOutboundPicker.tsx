"use client";

import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function LinkOutboundPicker({ inboundTaskId }: { inboundTaskId: string }) {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const setLinksForInbound = useWorkspaceStore((s) => s.setLinksForInbound);

  if (!snapshot) return null;

  const linked = new Set(
    snapshot.links
      .filter((l) => l.inboundTaskId === inboundTaskId)
      .map((l) => l.outboundTaskId),
  );

  const outbound = snapshot.outboundTasks.filter((t) => t.status !== "done");

  if (!outbound.length) {
    return (
      <p className="text-xs text-ink-muted mt-2">No outbound tasks to link.</p>
    );
  }

  return (
    <div className="mt-2 border-t border-paper-line pt-2">
      <p className="text-xs font-medium mb-1">Deliver via outbound</p>
      <div className="space-y-1">
        {outbound.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={linked.has(o.id)}
              onChange={(e) => {
                const next = new Set(linked);
                if (e.target.checked) next.add(o.id);
                else next.delete(o.id);
                void setLinksForInbound(inboundTaskId, [...next]);
              }}
            />
            {o.title}
          </label>
        ))}
      </div>
    </div>
  );
}
