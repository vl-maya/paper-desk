"use client";

import Link from "next/link";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { AskHistoryList } from "@/components/AskHistoryList";

export default function AskArchivePage() {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const deleteAskHistoryEntry = useWorkspaceStore(
    (s) => s.deleteAskHistoryEntry,
  );

  if (!snapshot) return null;

  return (
    <div className="max-w-2xl">
      <p className="mb-4">
        <Link
          href="/ask"
          className="text-sm text-accent underline hover:text-accent/80"
        >
          ← Back to Ask desk
        </Link>
      </p>
      <h2 className="font-serif text-2xl mb-2">Ask desk archive</h2>
      <p className="text-sm text-ink-muted mb-4">
        Saved responses you archived from Ask desk. Delete permanently here;
        they are grouped by day, newest first.
      </p>

      <AskHistoryList
        entries={snapshot.askHistory ?? []}
        settings={snapshot.settings}
        filter="archived"
        onDelete={(id) => void deleteAskHistoryEntry(id)}
      />
    </div>
  );
}
