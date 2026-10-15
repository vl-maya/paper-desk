import { TaskDirectionSchema, TaskSchema, TaskStatusSchema } from "@/lib/types/schemas";
import {
  ApiError,
  DateOnly,
  TaskCreateSchema,
  allTasks,
  handle,
  listKey,
  mutateWorkspace,
  parseBody,
  readWorkspace,
  uuidv4,
} from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/** GET /api/v1/tasks?direction=&status=a,b&backlog=true|false&dueBefore=&dueAfter=&q= */
export function GET(request: Request) {
  return handle(async () => {
    const sp = new URL(request.url).searchParams;
    const direction = sp.get("direction");
    const statuses = sp.get("status")?.split(",").filter(Boolean);
    const backlog = sp.get("backlog");
    const dueBefore = sp.get("dueBefore");
    const dueAfter = sp.get("dueAfter");
    const q = sp.get("q")?.toLowerCase();
    if (direction && !TaskDirectionSchema.safeParse(direction).success)
      throw new ApiError(400, "direction must be inbound|outbound");
    for (const s of statuses ?? [])
      if (!TaskStatusSchema.safeParse(s).success) throw new ApiError(400, `Invalid status: ${s}`);
    if (backlog && backlog !== "true" && backlog !== "false")
      throw new ApiError(400, "backlog must be true|false");
    for (const [k, v] of [["dueBefore", dueBefore], ["dueAfter", dueAfter]] as const)
      if (v && !DateOnly.safeParse(v).success) throw new ApiError(400, `${k} must be YYYY-MM-DD`);

    const ws = await readWorkspace();
    const tasks = allTasks(ws).filter((t) => {
      if (direction && t.direction !== direction) return false;
      if (statuses?.length && !statuses.includes(t.status)) return false;
      if (backlog && t.backlog !== (backlog === "true")) return false;
      if (dueBefore && !(t.dueDate && t.dueDate.slice(0, 10) <= dueBefore)) return false;
      if (dueAfter && !(t.dueDate && t.dueDate.slice(0, 10) >= dueAfter)) return false;
      if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return { tasks, count: tasks.length };
  });
}

export function POST(request: Request) {
  return handle(async () => {
    const input = await parseBody(request, TaskCreateSchema);
    const now = new Date().toISOString();
    const task = TaskSchema.parse({ ...input, id: uuidv4(), createdAt: now, updatedAt: now });
    return mutateWorkspace((ws) => {
      ws[listKey(task.direction)].push(task);
      return { result: { task }, audit: { action: "createTask", id: task.id } };
    });
  }, 201);
}
