"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useServerSync } from "@/hooks/useServerSync";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const loading = useWorkspaceStore((s) => s.loading);
  const error = useWorkspaceStore((s) => s.error);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useServerSync();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center paper-bg text-ink-muted">
        Loading workspace…
      </div>
    );
  }

  if (error && !useWorkspaceStore.getState().snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center paper-bg p-8">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}
