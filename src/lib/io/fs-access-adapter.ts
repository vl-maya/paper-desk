"use client";

import type { WorkspaceSnapshot } from "@/lib/types/schemas";
import { WORKSPACE_PATHS } from "@/lib/workspace/paths";

type FileHandle = FileSystemFileHandle;
type DirHandle = FileSystemDirectoryHandle;

async function readFileText(handle: FileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

async function writeFileText(handle: FileHandle, content: string) {
  const w = await handle.createWritable();
  await w.write(content);
  await w.close();
}

async function getOrCreateFile(
  dir: DirHandle,
  ...segments: string[]
): Promise<FileHandle> {
  let current: DirHandle = dir;
  for (let i = 0; i < segments.length - 1; i++) {
    current = await current.getDirectoryHandle(segments[i]!, { create: true });
  }
  return current.getFileHandle(segments[segments.length - 1]!, { create: true });
}

async function getFileIfExists(
  dir: DirHandle,
  ...segments: string[]
): Promise<FileHandle | null> {
  try {
    let current: DirHandle = dir;
    for (let i = 0; i < segments.length - 1; i++) {
      current = await current.getDirectoryHandle(segments[i]!);
    }
    return await current.getFileHandle(segments[segments.length - 1]!);
  } catch {
    return null;
  }
}

async function readJson<T>(
  root: DirHandle,
  path: string,
  fallback: T,
  parse: (raw: unknown) => T,
): Promise<T> {
  const parts = path.split("/");
  const handle = await getFileIfExists(root, ...parts);
  if (!handle) return fallback;
  try {
    const text = await readFileText(handle);
    return parse(JSON.parse(text));
  } catch {
    return fallback;
  }
}

import {
  AssigneeSchema,
  TaskTagSchema,
  NoteTagSchema,
  ManifestSchema,
  SettingsSchema,
  TaskLinkSchema,
  TaskSchema,
  NoteMetaSchema,
  ScheduleEventSchema,
  AskHistoryEntrySchema,
  WorkspaceSnapshotSchema,
} from "@/lib/types/schemas";
import {
  createEmptyWorkspace,
  normalizeSettings,
  DEFAULT_TASK_TAGS,
} from "@/lib/workspace/defaults";
import { z } from "zod";

const TasksFileSchema = z.object({ tasks: z.array(TaskSchema) });
const AssigneesFileSchema = z.object({ assignees: z.array(AssigneeSchema) });
const TaskTagsFileSchema = z.object({ tags: z.array(TaskTagSchema) });
const NoteTagsFileSchema = z.object({ tags: z.array(NoteTagSchema) });
const LinksFileSchema = z.object({ links: z.array(TaskLinkSchema) });
const NotesIndexSchema = z.object({ notes: z.array(NoteMetaSchema) });
const EventsFileSchema = z.object({ events: z.array(ScheduleEventSchema) });
const AskHistoryFileSchema = z.object({
  entries: z.array(AskHistoryEntrySchema),
});

export async function loadWorkspaceFromHandle(
  root: DirHandle,
): Promise<WorkspaceSnapshot> {
  const manifest = await readJson(
    root,
    WORKSPACE_PATHS.manifest,
    createEmptyWorkspace().manifest,
    (raw) => ManifestSchema.parse(raw),
  );
  const settings = await readJson(
    root,
    WORKSPACE_PATHS.settings,
    createEmptyWorkspace().settings,
    (raw) => normalizeSettings(SettingsSchema.parse(raw)),
  );
  const assignees = await readJson(
    root,
    WORKSPACE_PATHS.assignees,
    { assignees: [] },
    (raw) => AssigneesFileSchema.parse(raw),
  );
  const taskTags = await readJson(
    root,
    WORKSPACE_PATHS.taskTags,
    { tags: DEFAULT_TASK_TAGS.map((t) => ({ ...t })) },
    (raw) => TaskTagsFileSchema.parse(raw),
  );
  const noteTags = await readJson(
    root,
    WORKSPACE_PATHS.noteTags,
    { tags: [] },
    (raw) => NoteTagsFileSchema.parse(raw),
  );
  const inbound = await readJson(
    root,
    WORKSPACE_PATHS.inboundTasks,
    { tasks: [] },
    (raw) => TasksFileSchema.parse(raw),
  );
  const outbound = await readJson(
    root,
    WORKSPACE_PATHS.outboundTasks,
    { tasks: [] },
    (raw) => TasksFileSchema.parse(raw),
  );
  const links = await readJson(
    root,
    WORKSPACE_PATHS.links,
    { links: [] },
    (raw) => LinksFileSchema.parse(raw),
  );
  const notesIndex = await readJson(
    root,
    WORKSPACE_PATHS.notesIndex,
    { notes: [] },
    (raw) => NotesIndexSchema.parse(raw),
  );
  const scheduleEvents = await readJson(
    root,
    WORKSPACE_PATHS.scheduleEvents,
    { events: [] },
    (raw) => EventsFileSchema.parse(raw),
  );
  const askHistory = await readJson(
    root,
    WORKSPACE_PATHS.askHistory,
    { entries: [] },
    (raw) => AskHistoryFileSchema.parse(raw),
  );

  const noteBodies: Record<string, string> = {};
  for (const note of notesIndex.notes) {
    const byTitle = await getFileIfExists(
      root,
      ...WORKSPACE_PATHS.noteBody(note.title).split("/"),
    );
    if (byTitle) {
      noteBodies[note.id] = await readFileText(byTitle);
      continue;
    }
    const byId = await getFileIfExists(
      root,
      ...WORKSPACE_PATHS.noteBodyLegacy(note.id).split("/"),
    );
    noteBodies[note.id] = byId ? await readFileText(byId) : "";
  }

  return WorkspaceSnapshotSchema.parse({
    manifest,
    settings,
    assignees: assignees.assignees,
    taskTags: taskTags.tags,
    noteTags: noteTags.tags,
    inboundTasks: inbound.tasks,
    outboundTasks: outbound.tasks,
    links: links.links,
    notesIndex: notesIndex.notes,
    noteBodies,
    scheduleEvents: scheduleEvents.events,
    askHistory: askHistory.entries,
  });
}

export async function saveWorkspaceToHandle(
  root: DirHandle,
  snapshot: WorkspaceSnapshot,
): Promise<void> {
  const parsed = WorkspaceSnapshotSchema.parse(snapshot);
  const now = new Date().toISOString();
  parsed.manifest = { ...parsed.manifest, lastModified: now };

  const writes: [string, string][] = [
    [WORKSPACE_PATHS.manifest, JSON.stringify(parsed.manifest, null, 2)],
    [WORKSPACE_PATHS.settings, JSON.stringify(parsed.settings, null, 2)],
    [
      WORKSPACE_PATHS.assignees,
      JSON.stringify({ assignees: parsed.assignees }, null, 2),
    ],
    [
      WORKSPACE_PATHS.taskTags,
      JSON.stringify({ tags: parsed.taskTags }, null, 2),
    ],
    [
      WORKSPACE_PATHS.noteTags,
      JSON.stringify({ tags: parsed.noteTags }, null, 2),
    ],
    [
      WORKSPACE_PATHS.inboundTasks,
      JSON.stringify({ tasks: parsed.inboundTasks }, null, 2),
    ],
    [
      WORKSPACE_PATHS.outboundTasks,
      JSON.stringify({ tasks: parsed.outboundTasks }, null, 2),
    ],
    [WORKSPACE_PATHS.links, JSON.stringify({ links: parsed.links }, null, 2)],
    [
      WORKSPACE_PATHS.notesIndex,
      JSON.stringify({ notes: parsed.notesIndex }, null, 2),
    ],
    [
      WORKSPACE_PATHS.scheduleEvents,
      JSON.stringify({ events: parsed.scheduleEvents }, null, 2),
    ],
    [
      WORKSPACE_PATHS.askHistory,
      JSON.stringify({ entries: parsed.askHistory }, null, 2),
    ],
  ];

  for (const [rel, content] of writes) {
    const handle = await getOrCreateFile(root, ...rel.split("/"));
    await writeFileText(handle, content);
  }

  const activeRelPaths = new Set<string>();
  for (const note of parsed.notesIndex) {
    const rel = WORKSPACE_PATHS.noteBody(note.title);
    activeRelPaths.add(rel);
    const handle = await getOrCreateFile(root, ...rel.split("/"));
    const body = parsed.noteBodies?.[note.id] ?? "";
    await writeFileText(handle, body);
  }

  try {
    const notesDir = await root.getDirectoryHandle("notes");
    // @ts-expect-error AsyncIterable values on directory handle
    for await (const [name, handle] of notesDir.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".md")) continue;
      const rel = `notes/${name}`;
      if (activeRelPaths.has(rel)) continue;
      await notesDir.removeEntry(name).catch(() => undefined);
    }
  } catch {
    // notes dir may not exist yet
  }
}

export async function workspaceExistsOnHandle(root: DirHandle): Promise<boolean> {
  const parts = WORKSPACE_PATHS.manifest.split("/");
  const handle = await getFileIfExists(root, ...parts);
  return handle !== null;
}

export async function pickWorkspaceDirectory(): Promise<DirHandle | null> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    return null;
  }
  // @ts-expect-error File System Access API
  return window.showDirectoryPicker({ mode: "readwrite" });
}

const HANDLE_KEY = "paper-desk-fs-handle";

export function storeDirectoryHandle(handle: DirHandle) {
  sessionStorage.setItem(HANDLE_KEY, "linked");
  // Persist handle in IndexedDB for reload — simplified: user re-picks each session
  void handle;
}

export function isFsAccessLinked(): boolean {
  return sessionStorage.getItem(HANDLE_KEY) === "linked";
}
