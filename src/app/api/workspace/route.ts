import { NextResponse } from "next/server";
import {
  appendAuditLine,
  getWorkspaceRoot,
  loadWorkspaceFromDisk,
  saveWorkspaceToDisk,
  workspaceExists,
  initWorkspaceOnDisk,
} from "@/lib/io/server-fs";
import { WorkspaceSnapshotSchema } from "@/lib/types/schemas";

export async function GET() {
  const root = getWorkspaceRoot();
  const exists = await workspaceExists(root);
  if (!exists) {
    const snapshot = await initWorkspaceOnDisk(false, root);
    return NextResponse.json({ snapshot, root, initialized: true });
  }
  const snapshot = await loadWorkspaceFromDisk(root);
  return NextResponse.json({ snapshot, root, initialized: false });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const snapshot = WorkspaceSnapshotSchema.parse(body.snapshot);
  const root = getWorkspaceRoot();
  await saveWorkspaceToDisk(snapshot, root);
  if (body.audit) {
    await appendAuditLine(
      { ...body.audit, at: new Date().toISOString() },
      root,
    );
  }
  return NextResponse.json({ ok: true });
}
