import { NoteMetaSchema } from "@/lib/types/schemas";
import { noteMatchesSearchQuery } from "@/lib/notes/filter-notes";
import {
  NoteCreateSchema,
  assertUniqueNoteTitle,
  handle,
  mutateWorkspace,
  noteIsArchived,
  parseBody,
  readWorkspace,
  uuidv4,
} from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/** GET /api/v1/notes?q=&taskId=&archived= — metadata only (use /notes/[id] for the body). */
export function GET(request: Request) {
  return handle(async () => {
    const sp = new URL(request.url).searchParams;
    const q = sp.get("q")?.trim().toLowerCase();
    const taskId = sp.get("taskId");
    const archivedParam = sp.get("archived");
    const ws = await readWorkspace();
    const notes = ws.notesIndex
      .filter((n) => {
        const archived = noteIsArchived(n);
        if (archivedParam === "true" && !archived) return false;
        if (archivedParam === "false" && archived) return false;
        if (archivedParam === null && archived) return false;
        if (taskId && n.taskId !== taskId) return false;
        if (
          q &&
          !noteMatchesSearchQuery(
            n,
            q,
            ws.noteBodies?.[n.id] ?? "",
            ws.noteTags ?? [],
          )
        )
          return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { notes, count: notes.length };
  });
}

export function POST(request: Request) {
  return handle(async () => {
    const { body, ...input } = await parseBody(request, NoteCreateSchema);
    const now = new Date().toISOString();
    const note = NoteMetaSchema.parse({ ...input, id: uuidv4(), createdAt: now, updatedAt: now });
    return mutateWorkspace((ws) => {
      assertUniqueNoteTitle(ws, note.title);
      ws.notesIndex.push(note);
      ws.noteBodies = { ...(ws.noteBodies ?? {}), [note.id]: body };
      return { result: { note, body }, audit: { action: "note", id: note.id } };
    });
  }, 201);
}
