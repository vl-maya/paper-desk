import { NoteMetaSchema } from "@/lib/types/schemas";
import {
  ApiError,
  NotePutSchema,
  applyPatch,
  assertUniqueNoteTitle,
  handle,
  mutateWorkspace,
  noteBodyOf,
  parseBody,
  readWorkspace,
} from "@/lib/api/v1";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const ws = await readWorkspace();
    const note = ws.notesIndex.find((n) => n.id === id);
    if (!note) throw new ApiError(404, `Note ${id} not found`);
    return { note, body: noteBodyOf(ws, id) };
  });
}

/** PUT { title?, body?, taskId? } — updates metadata and/or markdown body. */
export function PUT(request: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const { body, ...meta } = await parseBody(request, NotePutSchema);
    return mutateWorkspace((ws) => {
      const i = ws.notesIndex.findIndex((n) => n.id === id);
      if (i < 0) throw new ApiError(404, `Note ${id} not found`);
      if (meta.title) assertUniqueNoteTitle(ws, meta.title, id);
      const note = NoteMetaSchema.parse({
        ...applyPatch(ws.notesIndex[i], meta),
        id,
        updatedAt: new Date().toISOString(),
      });
      ws.notesIndex[i] = note;
      const bodies = { ...(ws.noteBodies ?? {}) };
      if (body !== undefined) bodies[id] = body;
      ws.noteBodies = bodies;
      return { result: { note, body: bodies[id] ?? "" }, audit: { action: "note", id } };
    });
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    return mutateWorkspace((ws) => {
      const i = ws.notesIndex.findIndex((n) => n.id === id);
      if (i < 0) throw new ApiError(404, `Note ${id} not found`);
      ws.notesIndex.splice(i, 1);
      const bodies = { ...(ws.noteBodies ?? {}) };
      delete bodies[id];
      ws.noteBodies = bodies;
      const now = new Date().toISOString();
      for (const list of [ws.inboundTasks, ws.outboundTasks]) {
        for (let j = 0; j < list.length; j++) {
          const t = list[j];
          if (t.noteIds?.includes(id)) {
            list[j] = { ...t, noteIds: t.noteIds.filter((n) => n !== id), updatedAt: now };
          }
        }
      }
      return { result: { ok: true, id }, audit: { action: "deleteNote", id } };
    });
  });
}
