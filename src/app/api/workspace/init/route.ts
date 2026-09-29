import { NextResponse } from "next/server";
import { getWorkspaceRoot, initWorkspaceOnDisk } from "@/lib/io/server-fs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const example = Boolean(body.example);
  const root = getWorkspaceRoot();
  const snapshot = await initWorkspaceOnDisk(example, root);
  return NextResponse.json({ snapshot, root });
}
