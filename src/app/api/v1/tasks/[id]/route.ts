import { TaskSchema, type Task } from "@/lib/types/schemas";
import {
  TaskPatchSchema,
  allTasks,
  applyPatch,
  findTask,
  handle,
  listKey,
  mutateWorkspace,
  parseBody,
  readWorkspace,
  ApiError,
} from "@/lib/api/v1";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const task = allTasks(await readWorkspace()).find((t) => t.id === id);
    if (!task) throw new ApiError(404, `Task ${id} not found`);
    return { task };
  });
}

export function PATCH(request: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseBody(request, TaskPatchSchema);
    return mutateWorkspace((ws) => {
      const loc = findTask(ws, id);
      const prev = ws[loc.list][loc.index];
      const next: Task = TaskSchema.parse({
        ...applyPatch(prev, patch),
        id: prev.id,
        createdAt: prev.createdAt,
        updatedAt: new Date().toISOString(),
      });
      ws[loc.list].splice(loc.index, 1);
      if (next.direction !== prev.direction) {
        // Direction change moves the task; drop links that no longer make sense.
        ws.links = ws.links.filter((l) => l.inboundTaskId !== id && l.outboundTaskId !== id);
        ws[listKey(next.direction)].push(next);
      } else {
        ws[loc.list].splice(loc.index, 0, next);
      }
      return { result: { task: next }, audit: { action: "task", id, patch } };
    });
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    return mutateWorkspace((ws) => {
      const loc = findTask(ws, id);
      ws[loc.list].splice(loc.index, 1);
      ws.links = ws.links.filter((l) => l.inboundTaskId !== id && l.outboundTaskId !== id);
      ws.scheduleEvents = ws.scheduleEvents.map((e) => {
        if (e.taskId !== id) return e;
        const rest = { ...e };
        delete rest.taskId;
        return rest;
      });
      return { result: { ok: true, id }, audit: { action: "deleteTask", id } };
    });
  });
}
