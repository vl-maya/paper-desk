import fs from "fs/promises";
import path from "path";
import { ManifestSchema } from "@/lib/types/schemas";
import { getWorkspaceRoot } from "@/lib/io/server-fs";
import { WORKSPACE_PATHS } from "@/lib/workspace/paths";
import { handle } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/** Cheap change-detection endpoint used by the browser sync poller. */
export function GET() {
  return handle(async () => {
    try {
      const raw = await fs.readFile(
        path.join(getWorkspaceRoot(), WORKSPACE_PATHS.manifest),
        "utf8",
      );
      return { manifest: ManifestSchema.parse(JSON.parse(raw)) };
    } catch {
      return { manifest: null };
    }
  });
}
