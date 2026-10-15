import { NextResponse } from "next/server";
import { sanitizeNoteFileName } from "@/lib/notes/default-title";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  appendAuditLine,
  getWorkspaceRoot,
  initWorkspaceOnDisk,
  loadWorkspaceFromDisk,
  saveWorkspaceToDisk,
  withWriteLock,
  workspaceExists,
} from "@/lib/io/server-fs";
import {
  ScheduleEventSchema,
  TaskSchema,
  type WorkspaceSnapshot,
} from "@/lib/types/schemas";

export { uuidv4 };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const DateTimeLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Expected YYYY-MM-DDTHH:mm");

/** Fields a client may send when creating a task. */
export const TaskCreateSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: TaskSchema.shape.status.default("todo"),
  urgency: TaskSchema.shape.urgency.default(3),
  backlog: z.boolean().default(false),
  dueDate: DateOnly.optional(),
  deliveryDate: DateOnly.optional(),
});

/** PATCH body: any field; `null` clears an optional field. */
export const TaskPatchSchema = z
  .object({
    direction: TaskSchema.shape.direction,
    title: TaskSchema.shape.title,
    description: z.string().nullable(),
    status: TaskSchema.shape.status,
    urgency: TaskSchema.shape.urgency,
    dueDate: DateOnly.nullable(),
    deliveryDate: DateOnly.nullable(),
    assigneeId: z.string().uuid().nullable(),
    backlog: z.boolean(),
    tags: z.array(z.string()).nullable(),
    noteIds: z.array(z.string().uuid()).nullable(),
  })
  .partial()
  .strict();

export const EventCreateSchema = ScheduleEventSchema.omit({ id: true }).extend({
  title: z.string().min(1),
  start: DateTimeLocal,
  end: DateTimeLocal.optional(),
});

export const EventPatchSchema = z
  .object({
    title: z.string().min(1),
    start: DateTimeLocal,
    end: DateTimeLocal.nullable(),
    notes: z.string().nullable(),
    taskId: z.string().uuid().nullable(),
    archived: z.boolean(),
  })
  .partial()
  .strict();

export const NoteCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().default(""),
  taskId: z.string().uuid().optional(),
});

export const NotePutSchema = z
  .object({
    title: z.string().min(1),
    body: z.string(),
    taskId: z.string().uuid().nullable(),
    archived: z.boolean(),
  })
  .partial()
  .strict();

export function noteIsArchived(note: { archived?: boolean }): boolean {
  return note.archived ?? false;
}

/** Apply a patch where `null` deletes the key. */
export function applyPatch<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out as T;
}

export async function readWorkspace(): Promise<WorkspaceSnapshot> {
  const root = getWorkspaceRoot();
  if (!(await workspaceExists(root))) {
    return withWriteLock(() => initWorkspaceOnDisk(false, root));
  }
  return loadWorkspaceFromDisk(root);
}

/**
 * Read-modify-write under the process write lock. `fn` mutates the snapshot in
 * place and returns the response payload plus an audit record.
 */
export async function mutateWorkspace<R>(
  fn: (ws: WorkspaceSnapshot) => { result: R; audit: Record<string, unknown> },
): Promise<R> {
  const root = getWorkspaceRoot();
  return withWriteLock(async () => {
    const ws = (await workspaceExists(root))
      ? await loadWorkspaceFromDisk(root)
      : await initWorkspaceOnDisk(false, root);
    const { result, audit } = fn(ws);
    await saveWorkspaceToDisk(ws, root);
    await appendAuditLine(
      { ...audit, source: "api-v1", at: new Date().toISOString() },
      root,
    );
    return result;
  });
}


export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new ApiError(400, "Validation failed", z.treeifyError(r.error));
  return r.data;
}

export function handle(
  fn: () => Promise<unknown>,
  status = 200,
): Promise<NextResponse> {
  return fn().then(
    (data) => NextResponse.json(data, { status }),
    (e: unknown) => {
      if (e instanceof ApiError) {
        return NextResponse.json(
          { error: e.message, details: e.details },
          { status: e.status },
        );
      }
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: z.treeifyError(e) },
          { status: 400 },
        );
      }
      console.error("[api/v1]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Internal error" },
        { status: 500 },
      );
    },
  );
}

export function allTasks(ws: WorkspaceSnapshot) {
  return [...ws.inboundTasks, ...ws.outboundTasks];
}

export function findTask(ws: WorkspaceSnapshot, id: string) {
  const inIdx = ws.inboundTasks.findIndex((t) => t.id === id);
  if (inIdx >= 0) return { list: "inboundTasks" as const, index: inIdx };
  const outIdx = ws.outboundTasks.findIndex((t) => t.id === id);
  if (outIdx >= 0) return { list: "outboundTasks" as const, index: outIdx };
  throw new ApiError(404, `Task ${id} not found`);
}

export function listKey(direction: "inbound" | "outbound") {
  return direction === "inbound" ? ("inboundTasks" as const) : ("outboundTasks" as const);
}

export function noteBodyOf(ws: WorkspaceSnapshot, id: string) {
  return ws.noteBodies?.[id] ?? "";
}

export function assertUniqueNoteTitle(ws: WorkspaceSnapshot, title: string, selfId?: string) {
  const file = sanitizeNoteFileName(title);
  if (
    ws.notesIndex.some(
      (n) => n.id !== selfId && sanitizeNoteFileName(n.title) === file,
    )
  ) {
    throw new ApiError(409, `A note titled "${title}" already exists`);
  }
}
