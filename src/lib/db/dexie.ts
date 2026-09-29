import Dexie, { type Table } from "dexie";
import type { WorkspaceSnapshot } from "@/lib/types/schemas";

export class PaperDeskDB extends Dexie {
  snapshot!: Table<{ id: string; data: WorkspaceSnapshot; updatedAt: string }>;

  constructor() {
    super("paper-desk");
    this.version(1).stores({
      snapshot: "id",
    });
  }
}

export const db = typeof window !== "undefined" ? new PaperDeskDB() : null;

const SNAPSHOT_ID = "workspace";

export async function readMirrorFromIdb(): Promise<WorkspaceSnapshot | null> {
  if (!db) return null;
  const row = await db.snapshot.get(SNAPSHOT_ID);
  return row?.data ?? null;
}

export async function writeMirrorToIdb(data: WorkspaceSnapshot): Promise<void> {
  if (!db) return;
  await db.snapshot.put({
    id: SNAPSHOT_ID,
    data,
    updatedAt: new Date().toISOString(),
  });
}
