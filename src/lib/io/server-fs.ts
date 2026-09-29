import fs from "fs/promises";
import path from "path";
import {
  AssigneeSchema,
  TaskTagSchema,
  ManifestSchema,
  SettingsSchema,
  TaskLinkSchema,
  TaskSchema,
  NoteMetaSchema,
  ScheduleEventSchema,
  AskHistoryEntrySchema,
  WorkspaceSnapshotSchema,
  type WorkspaceSnapshot,
} from "@/lib/types/schemas";
import { WORKSPACE_PATHS } from "@/lib/workspace/paths";
import {
  createEmptyWorkspace,
  createExampleWorkspace,
  DEFAULT_TASK_TAGS,
  normalizeSettings,
} from "@/lib/workspace/defaults";
import { z } from "zod";

const TasksFileSchema = z.object({ tasks: z.array(TaskSchema) });
const AssigneesFileSchema = z.object({ assignees: z.array(AssigneeSchema) });
const TaskTagsFileSchema = z.object({ tags: z.array(TaskTagSchema) });
const LinksFileSchema = z.object({ links: z.array(TaskLinkSchema) });
const NotesIndexSchema = z.object({ notes: z.array(NoteMetaSchema) });
const EventsFileSchema = z.object({ events: z.array(ScheduleEventSchema) });
const AskHistoryFileSchema = z.object({
  entries: z.array(AskHistoryEntrySchema),
});

export function getWorkspaceRoot(): string {
  return (
    process.env.PAPER_DESK_DATA_DIR ??
    path.join(process.cwd(), "data", "workspace")
  );
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function atomicWrite(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, filePath);
}

async function readJsonFile<T>(
  filePath: string,
  fallback: () => T,
  parse: (raw: unknown) => T,
): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parse(JSON.parse(raw));
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback();
    }
    throw e;
  }
}

async function readNoteBodyFile(
  root: string,
  note: { id: string; title: string },
): Promise<string> {
  const byTitle = path.join(root, WORKSPACE_PATHS.noteBody(note.title));
  try {
    return await fs.readFile(byTitle, "utf8");
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const byId = path.join(root, WORKSPACE_PATHS.noteBodyLegacy(note.id));
  try {
    return await fs.readFile(byId, "utf8");
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw e;
  }
}

async function readNoteBodies(
  root: string,
  notesIndex: { id: string; title: string }[],
): Promise<Record<string, string>> {
  const bodies: Record<string, string> = {};
  for (const note of notesIndex) {
    bodies[note.id] = await readNoteBodyFile(root, note);
  }
  return bodies;
}

async function writeNoteBodiesToDisk(
  root: string,
  parsed: WorkspaceSnapshot,
): Promise<void> {
  const notesDir = path.join(root, "notes");
  await ensureDir(notesDir);

  const activeRelPaths = new Set<string>();
  for (const note of parsed.notesIndex) {
    const rel = WORKSPACE_PATHS.noteBody(note.title);
    activeRelPaths.add(rel);
    const body = parsed.noteBodies?.[note.id] ?? "";
    await atomicWrite(path.join(root, rel), body);
  }

  let entries: string[];
  try {
    entries = await fs.readdir(notesDir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const rel = `notes/${name}`;
    if (!activeRelPaths.has(rel)) {
      await fs.unlink(path.join(notesDir, name)).catch(() => undefined);
    }
  }
}

export async function loadWorkspaceFromDisk(
  root = getWorkspaceRoot(),
): Promise<WorkspaceSnapshot> {
  await ensureDir(root);
  await ensureDir(path.join(root, "inbound"));
  await ensureDir(path.join(root, "outbound"));
  await ensureDir(path.join(root, "notes"));
  await ensureDir(path.join(root, "schedule"));
  await ensureDir(path.join(root, "ask"));

  const manifest = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.manifest),
    () => createEmptyWorkspace().manifest,
    (raw) => ManifestSchema.parse(raw),
  );
  const settings = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.settings),
    () => createEmptyWorkspace().settings,
    (raw) => normalizeSettings(SettingsSchema.parse(raw)),
  );
  const assignees = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.assignees),
    () => ({ assignees: [] as z.infer<typeof AssigneeSchema>[] }),
    (raw) => AssigneesFileSchema.parse(raw),
  );
  const taskTags = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.taskTags),
    () => ({ tags: DEFAULT_TASK_TAGS.map((t) => ({ ...t })) }),
    (raw) => TaskTagsFileSchema.parse(raw),
  );
  const inbound = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.inboundTasks),
    () => ({ tasks: [] }),
    (raw) => TasksFileSchema.parse(raw),
  );
  const outbound = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.outboundTasks),
    () => ({ tasks: [] }),
    (raw) => TasksFileSchema.parse(raw),
  );
  const links = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.links),
    () => ({ links: [] }),
    (raw) => LinksFileSchema.parse(raw),
  );
  const notesIndex = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.notesIndex),
    () => ({ notes: [] }),
    (raw) => NotesIndexSchema.parse(raw),
  );
  const scheduleEvents = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.scheduleEvents),
    () => ({ events: [] }),
    (raw) => EventsFileSchema.parse(raw),
  );
  const askHistory = await readJsonFile(
    path.join(root, WORKSPACE_PATHS.askHistory),
    () => ({ entries: [] }),
    (raw) => AskHistoryFileSchema.parse(raw),
  );

  const noteBodies = await readNoteBodies(root, notesIndex.notes);

  const snapshot = {
    manifest,
    settings,
    assignees: assignees.assignees,
    taskTags: taskTags.tags,
    inboundTasks: inbound.tasks,
    outboundTasks: outbound.tasks,
    links: links.links,
    notesIndex: notesIndex.notes,
    noteBodies,
    scheduleEvents: scheduleEvents.events,
    askHistory: askHistory.entries,
  };
  return WorkspaceSnapshotSchema.parse(snapshot);
}

export async function saveWorkspaceToDisk(
  snapshot: WorkspaceSnapshot,
  root = getWorkspaceRoot(),
): Promise<void> {
  const parsed = WorkspaceSnapshotSchema.parse(snapshot);
  const now = new Date().toISOString();
  parsed.manifest = { ...parsed.manifest, lastModified: now };

  await ensureDir(root);
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.manifest),
    JSON.stringify(parsed.manifest, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.settings),
    JSON.stringify(parsed.settings, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.assignees),
    JSON.stringify({ assignees: parsed.assignees }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.taskTags),
    JSON.stringify({ tags: parsed.taskTags }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.inboundTasks),
    JSON.stringify({ tasks: parsed.inboundTasks }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.outboundTasks),
    JSON.stringify({ tasks: parsed.outboundTasks }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.links),
    JSON.stringify({ links: parsed.links }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.notesIndex),
    JSON.stringify({ notes: parsed.notesIndex }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.scheduleEvents),
    JSON.stringify({ events: parsed.scheduleEvents }, null, 2),
  );
  await atomicWrite(
    path.join(root, WORKSPACE_PATHS.askHistory),
    JSON.stringify({ entries: parsed.askHistory }, null, 2),
  );

  await writeNoteBodiesToDisk(root, parsed);
}

export async function appendAuditLine(
  line: Record<string, unknown>,
  root = getWorkspaceRoot(),
) {
  const p = path.join(root, WORKSPACE_PATHS.auditLog);
  await ensureDir(path.dirname(p));
  await fs.appendFile(p, `${JSON.stringify(line)}\n`, "utf8");
}

export async function initWorkspaceOnDisk(
  useExample: boolean,
  root = getWorkspaceRoot(),
): Promise<WorkspaceSnapshot> {
  const ws = useExample ? createExampleWorkspace() : createEmptyWorkspace();
  await saveWorkspaceToDisk(ws, root);
  return ws;
}

export async function workspaceExists(root = getWorkspaceRoot()): Promise<boolean> {
  try {
    await fs.access(path.join(root, WORKSPACE_PATHS.manifest));
    return true;
  } catch {
    return false;
  }
}
