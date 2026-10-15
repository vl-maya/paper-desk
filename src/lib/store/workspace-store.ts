"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  AskHistoryEntry,
  Assignee,
  NoteMeta,
  ScheduleEvent,
  Settings,
  SortPreset,
  Task,
  TaskDirection,
  TaskLink,
  TaskStatus,
  TaskTag,
  NoteTag,
  WorkspaceSnapshot,
} from "@/lib/types/schemas";
import type { QueryTemplateId } from "@/lib/query/mechanical";
import { normalizeTaskDateField } from "@/lib/dates/display";
import {
  createEmptyWorkspace,
  normalizeWorkspaceSnapshot,
} from "@/lib/workspace/defaults";
import { readMirrorFromIdb, writeMirrorToIdb } from "@/lib/db/dexie";
import {
  loadWorkspaceFromHandle,
  pickWorkspaceDirectory,
  saveWorkspaceToHandle,
  storeDirectoryHandle,
  workspaceExistsOnHandle,
} from "@/lib/io/fs-access-adapter";
import {
  applyDelayedToAll,
  countActiveTasks,
  shouldForceBacklog,
} from "@/lib/tasks/wip";
import {
  askHistoryNeedsSync,
  mergeAskHistory,
  mergeWorkspaceSnapshots,
} from "@/lib/workspace/merge";

let persistQueue: Promise<void> = Promise.resolve();
let persistPending = 0;

/** True while a local save is queued or in flight. */
export function hasPendingPersist(): boolean {
  return persistPending > 0;
}

/** Keep ask history when another mutation persisted from a stale snapshot. */
function reconcileAskHistoryForPersist(
  next: WorkspaceSnapshot,
  live: WorkspaceSnapshot | null,
  audit?: Record<string, unknown>,
): AskHistoryEntry[] {
  const nextHistory = next.askHistory ?? [];
  const action = audit?.action;
  if (
    action === "askHistory" ||
    action === "askHistoryUpdate" ||
    action === "askHistoryFinalize" ||
    action === "askHistoryFail" ||
    action === "archiveAsk" ||
    action === "deleteAsk"
  ) {
    return nextHistory;
  }
  if (!live?.askHistory?.length) return nextHistory;
  return mergeAskHistory(nextHistory, live.askHistory);
}

export type IoMode = "server" | "fs-access" | "idle";

type WorkspaceState = {
  snapshot: WorkspaceSnapshot | null;
  loading: boolean;
  error: string | null;
  ioMode: IoMode;
  fsHandle: FileSystemDirectoryHandle | null;
  serverRoot: string | null;
  linkedFolderName: string | null;
  message: string | null;
  hasHydrated: boolean;
  hydrateInFlight: Promise<void> | null;
  hydrate: () => Promise<void>;
  persist: (next: WorkspaceSnapshot, audit?: Record<string, unknown>) => Promise<void>;
  /**
   * Re-fetch the server snapshot when it changed externally (e.g. API/MCP writes).
   * Returns true if the local snapshot was replaced.
   */
  refreshFromServer: () => Promise<boolean>;
  initServerWorkspace: (example?: boolean) => Promise<void>;
  changeSaveFolder: () => Promise<void>;
  linkFolder: () => Promise<void>;
  clearMessage: () => void;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  upsertAssignee: (assignee: Assignee) => Promise<void>;
  removeAssignee: (id: string) => Promise<void>;
  upsertTaskTag: (tag: TaskTag) => Promise<void>;
  removeTaskTag: (id: string) => Promise<void>;
  upsertNoteTag: (tag: NoteTag) => Promise<void>;
  removeNoteTag: (id: string) => Promise<void>;
  reorderNoteTags: (orderedIds: string[]) => Promise<void>;
  upsertTask: (task: Task) => Promise<void>;
  createTask: (
    direction: TaskDirection,
    partial: Partial<Task> & { title: string },
  ) => Promise<Task>;
  deleteTask: (direction: TaskDirection, id: string) => Promise<void>;
  setTaskStatus: (
    direction: TaskDirection,
    id: string,
    status: TaskStatus,
  ) => Promise<void>;
  promoteFromBacklog: (direction: TaskDirection, id: string) => Promise<void>;
  demoteToBacklog: (direction: TaskDirection, id: string) => Promise<void>;
  setLinksForInbound: (inboundId: string, outboundIds: string[]) => Promise<void>;
  upsertNote: (
    note: NoteMeta,
    body: string,
  ) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  unarchiveNote: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  upsertScheduleEvent: (event: ScheduleEvent) => Promise<void>;
  archiveScheduleEvent: (id: string) => Promise<void>;
  unarchiveScheduleEvent: (id: string) => Promise<void>;
  deleteScheduleEvent: (id: string) => Promise<void>;
  addAskHistoryEntry: (
    entry: Omit<
      AskHistoryEntry,
      "id" | "archived" | "respondedAt" | "status"
    > & {
      templateId?: QueryTemplateId;
    },
  ) => Promise<void>;
  createAskHistoryPending: (
    entry: Omit<
      AskHistoryEntry,
      "id" | "archived" | "respondedAt" | "answer" | "status" | "startedAt"
    > & {
      id: string;
      templateId?: QueryTemplateId;
    },
  ) => Promise<void>;
  updateAskHistoryEntry: (
    id: string,
    patch: Partial<
      Pick<
        AskHistoryEntry,
        "answer" | "jobId" | "status" | "errorMessage" | "respondedAt"
      >
    >,
    options?: { persistToServer?: boolean },
  ) => Promise<void>;
  finalizeAskHistoryEntry: (
    id: string,
    answer: string,
  ) => Promise<void>;
  failAskHistoryEntry: (
    id: string,
    errorMessage: string,
    fallbackAnswer?: string,
  ) => Promise<void>;
  archiveAskHistoryEntry: (id: string) => Promise<void>;
  deleteAskHistoryEntry: (id: string) => Promise<void>;
};

function tasksForDirection(ws: WorkspaceSnapshot, direction: TaskDirection) {
  return direction === "inbound" ? ws.inboundTasks : ws.outboundTasks;
}

function setTasksForDirection(
  ws: WorkspaceSnapshot,
  direction: TaskDirection,
  tasks: Task[],
) {
  if (direction === "inbound") ws.inboundTasks = tasks;
  else ws.outboundTasks = tasks;
}

function stripTagFromTasks(tasks: Task[], tagId: string): Task[] {
  const now = new Date().toISOString();
  return tasks.map((t) => {
    if (!t.tags?.includes(tagId)) return t;
    return { ...t, tags: undefined, updatedAt: now };
  });
}

function stripTagFromNotes(notes: NoteMeta[], tagId: string): NoteMeta[] {
  const now = new Date().toISOString();
  return notes.map((n) => {
    if (!n.tagIds?.includes(tagId)) return n;
    const tagIds = n.tagIds.filter((id) => id !== tagId);
    return { ...n, tagIds, updatedAt: now };
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  snapshot: null,
  loading: true,
  error: null,
  ioMode: "idle",
  fsHandle: null,
  serverRoot: null,
  linkedFolderName: null,
  message: null,
  hasHydrated: false,
  hydrateInFlight: null,

  clearMessage: () => set({ message: null }),

  persist: async (next, audit) => {
    persistPending += 1;
    persistQueue = persistQueue.then(async () => {
     try {
      const { ioMode, fsHandle } = get();
      const live = get().snapshot;
      const normalized: WorkspaceSnapshot = normalizeWorkspaceSnapshot({
        ...next,
        askHistory: reconcileAskHistoryForPersist(next, live, audit),
      });
      set({ snapshot: normalized });
      await writeMirrorToIdb(normalized);

      if (ioMode === "fs-access" && fsHandle) {
        await saveWorkspaceToHandle(fsHandle, normalized);
      } else {
        try {
          const res = await fetchJson<{ ok: boolean; lastModified?: string }>(
            "/api/workspace",
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ snapshot: normalized, audit }),
            },
          );
          const cur = get().snapshot;
          if (res.lastModified && cur) {
            // Track the server's stamp so the sync poller doesn't treat our own save as external.
            set({
              snapshot: {
                ...cur,
                manifest: { ...cur.manifest, lastModified: res.lastModified },
              },
              ioMode: "server",
            });
          } else {
            set({ ioMode: "server" });
          }
        } catch {
          /* IDB mirror already updated when server unreachable */
        }
      }
     } finally {
      persistPending -= 1;
     }
    });
    await persistQueue;
  },

  refreshFromServer: async () => {
    const { ioMode, snapshot } = get();
    if (ioMode !== "server" || !snapshot || persistPending > 0) return false;
    const data = await fetchJson<{ snapshot: WorkspaceSnapshot; root: string }>(
      "/api/workspace",
    );
    // A local edit may have started while we were fetching; let it win.
    if (persistPending > 0) return false;
    const live = get().snapshot;
    if (live && live.manifest.lastModified === data.snapshot.manifest.lastModified) {
      return false;
    }
    const merged = normalizeWorkspaceSnapshot(
      mergeWorkspaceSnapshots(data.snapshot, live),
    );
    set({ snapshot: merged });
    await writeMirrorToIdb(merged);
    return true;
  },

  hydrate: async () => {
    if (get().hasHydrated) return;
    const inFlight = get().hydrateInFlight;
    if (inFlight) {
      await inFlight;
      return;
    }

    const task = (async () => {
      set({ loading: true, error: null });
      try {
        const cached = await readMirrorFromIdb();
        if (cached) set({ snapshot: normalizeWorkspaceSnapshot(cached) });

        try {
          const data = await fetchJson<{
            snapshot: WorkspaceSnapshot;
            root: string;
          }>("/api/workspace");
          const merged = normalizeWorkspaceSnapshot(
            mergeWorkspaceSnapshots(data.snapshot, cached),
          );
          set({
            snapshot: merged,
            ioMode: "server",
            serverRoot: data.root,
            linkedFolderName: null,
            fsHandle: null,
            hasHydrated: true,
            loading: false,
          });
          await writeMirrorToIdb(merged);
          if (askHistoryNeedsSync(merged, data.snapshot)) {
            try {
              await fetchJson("/api/workspace", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ snapshot: merged }),
              });
            } catch {
              /* best-effort sync */
            }
          }
          return;
        } catch {
          /* server unavailable */
        }

        if (cached) {
          set({ ioMode: "idle", hasHydrated: true, loading: false });
          return;
        }

        set({
          snapshot: createEmptyWorkspace(),
          ioMode: "idle",
          hasHydrated: true,
          loading: false,
        });
      } catch (e) {
        set({
          error: e instanceof Error ? e.message : "Failed to load",
          hasHydrated: true,
          loading: false,
        });
      } finally {
        set({ hydrateInFlight: null });
      }
    })();

    set({ hydrateInFlight: task });
    await task;
  },

  initServerWorkspace: async (example = false) => {
    const data = await fetchJson<{ snapshot: WorkspaceSnapshot; root: string }>(
      "/api/workspace/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ example }),
      },
    );
    await writeMirrorToIdb(data.snapshot);
    set({
      snapshot: data.snapshot,
      ioMode: "server",
      serverRoot: data.root,
      linkedFolderName: null,
      fsHandle: null,
    });
  },

  changeSaveFolder: async () => {
    let handle: FileSystemDirectoryHandle | null;
    try {
      handle = await pickWorkspaceDirectory();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      throw e;
    }
    if (!handle) {
      set({ error: "Folder picker unavailable in this browser." });
      return;
    }
    const current = get().snapshot ?? createEmptyWorkspace();
    let snapshot: WorkspaceSnapshot;
    let message: string;
    if (await workspaceExistsOnHandle(handle)) {
      snapshot = await loadWorkspaceFromHandle(handle);
      message = `Opened workspace in “${handle.name}”. Saves go to that folder.`;
    } else {
      snapshot = current;
      await saveWorkspaceToHandle(handle, snapshot);
      message = `Copied workspace into “${handle.name}”. Saves go to that folder.`;
    }
    storeDirectoryHandle(handle);
    await writeMirrorToIdb(snapshot);
    set({
      snapshot,
      fsHandle: handle,
      ioMode: "fs-access",
      linkedFolderName: handle.name,
      error: null,
      message,
    });
  },

  linkFolder: async () => {
    await get().changeSaveFolder();
  },

  updateSettings: async (patch) => {
    const ws = get().snapshot;
    if (!ws) return;
    const next = {
      ...ws,
      settings: { ...ws.settings, ...patch },
    };
    await get().persist(next, { action: "settings", patch });
  },

  upsertAssignee: async (assignee) => {
    const ws = get().snapshot;
    if (!ws) return;
    const idx = ws.assignees.findIndex((a) => a.id === assignee.id);
    const assignees = [...ws.assignees];
    if (idx >= 0) assignees[idx] = assignee;
    else assignees.push(assignee);
    await get().persist({ ...ws, assignees }, { action: "assignee", id: assignee.id });
  },

  removeAssignee: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const assignees = ws.assignees.filter((a) => a.id !== id);
    await get().persist({ ...ws, assignees }, { action: "removeAssignee", id });
  },

  upsertTaskTag: async (tag) => {
    const ws = get().snapshot;
    if (!ws) return;
    const idx = ws.taskTags.findIndex((t) => t.id === tag.id);
    const taskTags = [...ws.taskTags];
    if (idx >= 0) taskTags[idx] = tag;
    else taskTags.push(tag);
    await get().persist({ ...ws, taskTags }, { action: "taskTag", id: tag.id });
  },

  removeTaskTag: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const taskTags = ws.taskTags.filter((t) => t.id !== id);
    const inboundTasks = stripTagFromTasks(ws.inboundTasks, id);
    const outboundTasks = stripTagFromTasks(ws.outboundTasks, id);
    await get().persist(
      { ...ws, taskTags, inboundTasks, outboundTasks },
      { action: "removeTaskTag", id },
    );
  },

  upsertNoteTag: async (tag) => {
    const ws = get().snapshot;
    if (!ws) return;
    const idx = ws.noteTags.findIndex((t) => t.id === tag.id);
    const noteTags = [...ws.noteTags];
    if (idx >= 0) noteTags[idx] = tag;
    else noteTags.push(tag);
    await get().persist({ ...ws, noteTags }, { action: "noteTag", id: tag.id });
  },

  removeNoteTag: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const noteTags = ws.noteTags.filter((t) => t.id !== id);
    const notesIndex = stripTagFromNotes(ws.notesIndex, id);
    await get().persist(
      { ...ws, noteTags, notesIndex },
      { action: "removeNoteTag", id },
    );
  },

  reorderNoteTags: async (orderedIds) => {
    const ws = get().snapshot;
    if (!ws) return;
    const byId = new Map(ws.noteTags.map((t) => [t.id, t]));
    const noteTags: NoteTag[] = [];
    for (const id of orderedIds) {
      const tag = byId.get(id);
      if (tag) {
        noteTags.push(tag);
        byId.delete(id);
      }
    }
    for (const tag of ws.noteTags) {
      if (byId.has(tag.id)) noteTags.push(tag);
    }
    await get().persist({ ...ws, noteTags }, { action: "reorderNoteTags" });
  },

  upsertTask: async (task) => {
    const ws = get().snapshot;
    if (!ws) return;
    let updated: Task = {
      ...task,
      dueDate: normalizeTaskDateField(task.dueDate),
      deliveryDate: normalizeTaskDateField(task.deliveryDate),
      updatedAt: new Date().toISOString(),
    };
    const existing = tasksForDirection(ws, task.direction);
    if (!updated.backlog && updated.status !== "done") {
      if (shouldForceBacklog(existing, ws.settings, updated.id)) {
        updated = { ...updated, backlog: true };
        set({ message: "Moved to backlog — WIP limit reached." });
      }
    }
    const tasks = applyDelayedToAll(
      existing.map((t) => (t.id === updated.id ? updated : t)),
    );
    const next = { ...ws };
    setTasksForDirection(next, task.direction, tasks);
    await get().persist(next, { action: "task", id: task.id });
  },

  createTask: async (direction, partial) => {
    const ws = get().snapshot ?? createEmptyWorkspace();
    const now = new Date().toISOString();
    let backlog = partial.backlog ?? false;
    const tasks = tasksForDirection(ws, direction);
    if (!backlog && partial.status !== "done") {
      if (shouldForceBacklog(tasks, ws.settings)) {
        backlog = true;
        set({
          message: "Moved to backlog — WIP limit reached.",
        });
      }
    }
    const task: Task = {
      id: uuidv4(),
      direction,
      title: partial.title,
      description: partial.description,
      status: partial.status ?? "todo",
      urgency: partial.urgency ?? 3,
      dueDate: normalizeTaskDateField(partial.dueDate),
      deliveryDate: normalizeTaskDateField(partial.deliveryDate),
      assigneeId: partial.assigneeId,
      backlog,
      createdAt: now,
      updatedAt: now,
      tags: partial.tags,
      noteIds: partial.noteIds,
    };
    const nextTasks = applyDelayedToAll([...tasks, task]);
    const next = { ...ws };
    setTasksForDirection(next, direction, nextTasks);
    await get().persist(next, { action: "createTask", id: task.id });
    return task;
  },

  deleteTask: async (direction, id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const tasks = tasksForDirection(ws, direction).filter((t) => t.id !== id);
    const links = ws.links.filter(
      (l) =>
        direction === "inbound"
          ? l.inboundTaskId !== id
          : l.outboundTaskId !== id,
    );
    await get().persist(
      { ...ws, links, ...(direction === "inbound" ? { inboundTasks: tasks } : { outboundTasks: tasks }) },
      { action: "deleteTask", id },
    );
  },

  setTaskStatus: async (direction, id, status) => {
    const ws = get().snapshot;
    if (!ws) return;
    const tasks = tasksForDirection(ws, direction).map((t) => {
      if (t.id !== id) return t;
      let backlog = t.backlog;
      if (status !== "done" && !backlog) {
        if (shouldForceBacklog(tasksForDirection(ws, direction), ws.settings, id)) {
          backlog = true;
          set({ message: "Moved to backlog — WIP limit reached." });
        }
      }
      return {
        ...t,
        status,
        backlog: status === "done" ? false : backlog,
        updatedAt: new Date().toISOString(),
      };
    });
    const next = { ...ws };
    setTasksForDirection(next, direction, applyDelayedToAll(tasks));
    await get().persist(next, { action: "status", id, status });
  },

  promoteFromBacklog: async (direction, id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const tasks = tasksForDirection(ws, direction);
    if (shouldForceBacklog(tasks, ws.settings, id)) {
      set({
        message: "Cannot promote — active WIP is at limit. Demote another task first.",
      });
      return;
    }
    const updated = tasks.map((t) =>
      t.id === id
        ? { ...t, backlog: false, updatedAt: new Date().toISOString() }
        : t,
    );
    const next = { ...ws };
    setTasksForDirection(next, direction, updated);
    await get().persist(next, { action: "promote", id });
  },

  demoteToBacklog: async (direction, id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const tasks = tasksForDirection(ws, direction).map((t) =>
      t.id === id
        ? { ...t, backlog: true, updatedAt: new Date().toISOString() }
        : t,
    );
    const next = { ...ws };
    setTasksForDirection(next, direction, tasks);
    await get().persist(next, { action: "demote", id });
  },

  setLinksForInbound: async (inboundId, outboundIds) => {
    const ws = get().snapshot;
    if (!ws) return;
    const rest = ws.links.filter((l) => l.inboundTaskId !== inboundId);
    const added: TaskLink[] = outboundIds.map((outboundTaskId) => ({
      inboundTaskId: inboundId,
      outboundTaskId,
    }));
    await get().persist(
      { ...ws, links: [...rest, ...added] },
      { action: "links", inboundId },
    );
  },

  upsertNote: async (note, body) => {
    const ws = get().snapshot;
    if (!ws) return;
    const idx = ws.notesIndex.findIndex((n) => n.id === note.id);
    const notesIndex = [...ws.notesIndex];
    if (idx >= 0) notesIndex[idx] = note;
    else notesIndex.push(note);
    const noteBodies = { ...(ws.noteBodies ?? {}), [note.id]: body };
    await get().persist(
      { ...ws, notesIndex, noteBodies },
      { action: "note", id: note.id },
    );
  },

  archiveNote: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const now = new Date().toISOString();
    const notesIndex = ws.notesIndex.map((n) =>
      n.id === id ? { ...n, archived: true, updatedAt: now } : n,
    );
    await get().persist({ ...ws, notesIndex }, { action: "archiveNote", id });
  },

  unarchiveNote: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const now = new Date().toISOString();
    const notesIndex = ws.notesIndex.map((n) =>
      n.id === id ? { ...n, archived: false, updatedAt: now } : n,
    );
    await get().persist({ ...ws, notesIndex }, { action: "unarchiveNote", id });
  },

  deleteNote: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const notesIndex = ws.notesIndex.filter((n) => n.id !== id);
    const noteBodies = { ...(ws.noteBodies ?? {}) };
    delete noteBodies[id];
    await get().persist({ ...ws, notesIndex, noteBodies }, { action: "deleteNote", id });
  },

  upsertScheduleEvent: async (event) => {
    const ws = get().snapshot;
    if (!ws) return;
    const idx = ws.scheduleEvents.findIndex((e) => e.id === event.id);
    const scheduleEvents = [...ws.scheduleEvents];
    if (idx >= 0) scheduleEvents[idx] = event;
    else scheduleEvents.push(event);
    await get().persist({ ...ws, scheduleEvents }, { action: "event", id: event.id });
  },

  archiveScheduleEvent: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const scheduleEvents = ws.scheduleEvents.map((e) =>
      e.id === id ? { ...e, archived: true } : e,
    );
    await get().persist({ ...ws, scheduleEvents }, { action: "archiveEvent", id });
  },

  unarchiveScheduleEvent: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const scheduleEvents = ws.scheduleEvents.map((e) =>
      e.id === id ? { ...e, archived: false } : e,
    );
    await get().persist({ ...ws, scheduleEvents }, { action: "unarchiveEvent", id });
  },

  deleteScheduleEvent: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const scheduleEvents = ws.scheduleEvents.filter((e) => e.id !== id);
    await get().persist({ ...ws, scheduleEvents }, { action: "deleteEvent", id });
  },

  addAskHistoryEntry: async (entry) => {
    const ws = get().snapshot;
    if (!ws) return;
    const record: AskHistoryEntry = {
      id: uuidv4(),
      prompt: entry.prompt,
      answer: entry.answer,
      source: entry.source,
      provider: entry.provider,
      model: entry.model,
      templateId: entry.templateId,
      respondedAt: new Date().toISOString(),
      archived: false,
      status: "completed",
    };
    const next = { ...ws, askHistory: [record, ...(ws.askHistory ?? [])] };
    set({ snapshot: next });
    await writeMirrorToIdb(next);
    await get().persist(next, { action: "askHistory", id: record.id });
  },

  createAskHistoryPending: async (entry) => {
    const ws = get().snapshot;
    if (!ws) return;
    const now = new Date().toISOString();
    const record: AskHistoryEntry = {
      id: entry.id,
      prompt: entry.prompt,
      answer: "",
      source: entry.source,
      provider: entry.provider,
      model: entry.model,
      templateId: entry.templateId,
      respondedAt: now,
      archived: false,
      status: "running",
      startedAt: now,
    };
    const next = { ...ws, askHistory: [record, ...(ws.askHistory ?? [])] };
    set({ snapshot: next });
    await writeMirrorToIdb(next);
    await get().persist(next, { action: "askHistory", id: record.id });
  },

  updateAskHistoryEntry: async (id, patch, options) => {
    const ws = get().snapshot;
    if (!ws) return;
    const next = {
      ...ws,
      askHistory: (ws.askHistory ?? []).map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    };
    set({ snapshot: next });
    await writeMirrorToIdb(next);
    if (options?.persistToServer) {
      await get().persist(next, { action: "askHistoryUpdate", id });
    }
  },

  finalizeAskHistoryEntry: async (id, answer) => {
    const ws = get().snapshot;
    if (!ws) return;
    const respondedAt = new Date().toISOString();
    const next = {
      ...ws,
      askHistory: (ws.askHistory ?? []).map((e) =>
        e.id === id
          ? {
              ...e,
              answer,
              status: "completed" as const,
              errorMessage: undefined,
              respondedAt,
            }
          : e,
      ),
    };
    set({ snapshot: next });
    await writeMirrorToIdb(next);
    await get().persist(next, { action: "askHistoryFinalize", id });
  },

  failAskHistoryEntry: async (id, errorMessage, fallbackAnswer) => {
    const ws = get().snapshot;
    if (!ws) return;
    const respondedAt = new Date().toISOString();
    const next = {
      ...ws,
      askHistory: (ws.askHistory ?? []).map((e) => {
        if (e.id !== id) return e;
        const answer =
          fallbackAnswer !== undefined && fallbackAnswer.length > 0
            ? fallbackAnswer
            : e.answer;
        return {
          ...e,
          answer,
          status: "failed" as const,
          errorMessage,
          respondedAt,
        };
      }),
    };
    set({ snapshot: next });
    await writeMirrorToIdb(next);
    await get().persist(next, { action: "askHistoryFail", id });
  },

  archiveAskHistoryEntry: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const next = {
      ...ws,
      askHistory: (ws.askHistory ?? []).map((e) =>
        e.id === id ? { ...e, archived: true } : e,
      ),
    };
    set({ snapshot: next });
    await get().persist(next, { action: "archiveAsk", id });
  },

  deleteAskHistoryEntry: async (id) => {
    const ws = get().snapshot;
    if (!ws) return;
    const next = {
      ...ws,
      askHistory: (ws.askHistory ?? []).filter((e) => e.id !== id),
    };
    set({ snapshot: next });
    await get().persist(next, { action: "deleteAsk", id });
  },
}));

export function useWipCounts(direction: TaskDirection) {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  if (!snapshot) return { active: 0, backlog: 0, limit: 5 };
  const tasks =
    direction === "inbound" ? snapshot.inboundTasks : snapshot.outboundTasks;
  return {
    active: countActiveTasks(tasks, snapshot.settings),
    backlog: tasks.filter((t) => t.backlog && t.status !== "done").length,
    limit: snapshot.settings.wipLimit,
  };
}

export function useTotalBacklogCount(): number {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  if (!snapshot) return 0;
  return [...snapshot.inboundTasks, ...snapshot.outboundTasks].filter(
    (t) => t.backlog && t.status !== "done",
  ).length;
}

/** Active queue size for a direction (matches Inbound/Outbound board, excludes backlog & delivered). */
export function useDirectionActiveCount(direction: TaskDirection): number {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  if (!snapshot) return 0;
  const tasks =
    direction === "inbound" ? snapshot.inboundTasks : snapshot.outboundTasks;
  return tasks.filter((t) => t.status !== "done" && !t.backlog).length;
}

export function useTotalDeliveredCount(): number {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  if (!snapshot) return 0;
  return [...snapshot.inboundTasks, ...snapshot.outboundTasks].filter(
    (t) => t.status === "done",
  ).length;
}

export function getSortPreset(
  snapshot: WorkspaceSnapshot,
  direction: TaskDirection,
): SortPreset {
  return direction === "inbound"
    ? snapshot.settings.defaultSortInbound
    : snapshot.settings.defaultSortOutbound;
}
