import { sanitizeNoteFileName } from "@/lib/notes/default-title";

/** Relative paths inside a workspace root folder. */
export const WORKSPACE_PATHS = {
  manifest: "manifest.json",
  settings: "settings.json",
  assignees: "assignees.json",
  taskTags: "task-tags.json",
  noteTags: "note-tags.json",
  inboundTasks: "inbound/tasks.json",
  outboundTasks: "outbound/tasks.json",
  links: "links.json",
  notesIndex: "notes/index.json",
  scheduleEvents: "schedule/events.json",
  askHistory: "ask/history.json",
  auditLog: "audit.log.jsonl",
  noteBody: (title: string) => `notes/${sanitizeNoteFileName(title)}.md`,
  /** Pre–title-based filenames keyed by note id (read fallback only). */
  noteBodyLegacy: (id: string) => `notes/${id}.md`,
} as const;
