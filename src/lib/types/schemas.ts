import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "testing",
  "blocked",
  "delayed",
  "done",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskDirectionSchema = z.enum(["inbound", "outbound"]);
export type TaskDirection = z.infer<typeof TaskDirectionSchema>;

export const SortPresetSchema = z.enum([
  "urgency_desc",
  "due_asc",
  "delivery_asc",
  "created_desc",
]);
export type SortPreset = z.infer<typeof SortPresetSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  direction: TaskDirectionSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema,
  urgency: z.number().int().min(1).max(5),
  dueDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  backlog: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()).optional(),
  noteIds: z.array(z.string().uuid()).optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskLinkSchema = z.object({
  inboundTaskId: z.string().uuid(),
  outboundTaskId: z.string().uuid(),
});
export type TaskLink = z.infer<typeof TaskLinkSchema>;

export const AssigneeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().optional(),
});
export type Assignee = z.infer<typeof AssigneeSchema>;

export const TaskTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().min(1),
});
export type TaskTag = z.infer<typeof TaskTagSchema>;

export const AiSelectableModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  cliModel: z.string().optional(),
  tierLabel: z.string().optional(),
  featured: z.boolean().optional(),
});
export type AiSelectableModel = z.infer<typeof AiSelectableModelSchema>;

export const AiSelectableModelsByProviderSchema = z.object({
  claude: z.array(AiSelectableModelSchema).optional(),
  cursor: z.array(AiSelectableModelSchema).optional(),
});
export type AiSelectableModelsByProvider = z.infer<
  typeof AiSelectableModelsByProviderSchema
>;

export const SettingsSchema = z.object({
  wipLimit: z.number().int().min(1).default(5),
  wipActiveStatuses: z
    .array(TaskStatusSchema)
    .default(["todo", "in_progress", "testing"]),
  defaultSortInbound: SortPresetSchema.default("urgency_desc"),
  defaultSortOutbound: SortPresetSchema.default("urgency_desc"),
  aiProvider: z.enum(["claude", "cursor"]).default("claude"),
  aiModel: z.string().default("sonnet"),
  aiModelsByProvider: z
    .object({
      claude: z.string().optional(),
      cursor: z.string().optional(),
    })
    .optional(),
  aiSelectableModels: AiSelectableModelsByProviderSchema.optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const NoteMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  taskId: z.string().uuid().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
export type NoteMeta = z.infer<typeof NoteMetaSchema>;

export const ScheduleEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  start: z.string(),
  end: z.string().optional(),
  notes: z.string().optional(),
  taskId: z.string().uuid().optional(),
});
export type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

export const AskHistoryStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
]);
export type AskHistoryStatus = z.infer<typeof AskHistoryStatusSchema>;

export const AskHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  prompt: z.string(),
  answer: z.string(),
  source: z.enum(["mechanical", "ai"]),
  provider: z.enum(["claude", "cursor"]).optional(),
  model: z.string().optional(),
  templateId: z.string().optional(),
  respondedAt: z.string(),
  archived: z.boolean().default(false),
  status: AskHistoryStatusSchema.default("completed"),
  startedAt: z.string().optional(),
  errorMessage: z.string().optional(),
  jobId: z.string().uuid().optional(),
});
export type AskHistoryEntry = z.infer<typeof AskHistoryEntrySchema>;

export const ManifestSchema = z.object({
  version: z.number().int(),
  lastModified: z.string(),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const WorkspaceSnapshotSchema = z.object({
  manifest: ManifestSchema,
  settings: SettingsSchema,
  assignees: z.array(AssigneeSchema),
  taskTags: z.array(TaskTagSchema).default([]),
  inboundTasks: z.array(TaskSchema),
  outboundTasks: z.array(TaskSchema),
  links: z.array(TaskLinkSchema),
  notesIndex: z.array(NoteMetaSchema),
  noteBodies: z.record(z.string(), z.string()).optional(),
  scheduleEvents: z.array(ScheduleEventSchema),
  askHistory: z.array(AskHistoryEntrySchema).default([]),
});
export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;
