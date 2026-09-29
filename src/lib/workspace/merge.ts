import type { AskHistoryEntry, WorkspaceSnapshot } from "@/lib/types/schemas";

function entryStatus(e: AskHistoryEntry): "running" | "completed" | "failed" {
  return e.status ?? "completed";
}

function isTerminal(e: AskHistoryEntry): boolean {
  const s = entryStatus(e);
  return s === "completed" || s === "failed";
}

function pickNewerEntry(a: AskHistoryEntry, b: AskHistoryEntry): AskHistoryEntry {
  const aTerm = isTerminal(a);
  const bTerm = isTerminal(b);
  if (aTerm && !bTerm) return a;
  if (bTerm && !aTerm) return b;
  if (aTerm && bTerm) {
    return new Date(a.respondedAt) >= new Date(b.respondedAt) ? a : b;
  }
  if (b.answer.length !== a.answer.length) {
    return b.answer.length > a.answer.length ? b : a;
  }
  return new Date(b.respondedAt) >= new Date(a.respondedAt) ? b : a;
}

export function mergeAskHistory(
  a: AskHistoryEntry[],
  b: AskHistoryEntry[],
): AskHistoryEntry[] {
  const map = new Map<string, AskHistoryEntry>();
  for (const e of a) map.set(e.id, e);
  for (const e of b) {
    const prev = map.get(e.id);
    if (!prev) {
      map.set(e.id, e);
    } else {
      map.set(e.id, pickNewerEntry(prev, e));
    }
  }
  return [...map.values()].sort(
    (x, y) =>
      new Date(y.respondedAt).getTime() - new Date(x.respondedAt).getTime(),
  );
}

/** Prefer server fields; merge ask history from both sources. */
export function mergeWorkspaceSnapshots(
  server: WorkspaceSnapshot,
  local: WorkspaceSnapshot | null | undefined,
): WorkspaceSnapshot {
  if (!local) {
    return { ...server, askHistory: server.askHistory ?? [] };
  }
  return {
    ...server,
    askHistory: mergeAskHistory(
      server.askHistory ?? [],
      local.askHistory ?? [],
    ),
  };
}

export function askHistoryNeedsSync(
  merged: WorkspaceSnapshot,
  server: WorkspaceSnapshot,
): boolean {
  const mergedCount = (merged.askHistory ?? []).filter((e) => !e.archived).length;
  const serverCount = (server.askHistory ?? []).filter((e) => !e.archived).length;
  return mergedCount > serverCount;
}
