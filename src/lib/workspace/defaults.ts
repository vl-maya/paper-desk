import type {
  AiSelectableModel,
  Assignee,
  Settings,
  TaskTag,
  WorkspaceSnapshot,
} from "@/lib/types/schemas";
import {
  builtinSelectableModelsForProvider,
  coerceModelForProvider,
  defaultAiModelsByProvider,
  defaultAiSelectableModels,
  mergeAiModelsByProvider,
  mergeAiSelectableModels,
  type AiProvider,
} from "@/lib/ai/providers";

/** Stable ids so tag references in exported JSON stay valid across seeds. */
export const DEFAULT_TASK_TAGS: TaskTag[] = [
  {
    id: "d1000000-0000-4000-8000-000000000001",
    name: "deliverables",
    color: "#78716c",
  },
  {
    id: "d1000000-0000-4000-8000-000000000002",
    name: "deployment",
    color: "#2563eb",
  },
  {
    id: "d1000000-0000-4000-8000-000000000003",
    name: "request",
    color: "#9333ea",
  },
];

const defaultSelectable = defaultAiSelectableModels();

export const DEFAULT_SETTINGS: Settings = {
  wipLimit: 5,
  wipActiveStatuses: ["todo", "in_progress", "testing"],
  defaultSortInbound: "urgency_desc",
  defaultSortOutbound: "urgency_desc",
  aiProvider: "claude",
  aiModel: "sonnet",
  aiModelsByProvider: {
    claude: "sonnet",
    cursor: "auto-cost",
  },
  aiSelectableModels: defaultSelectable,
};

function withNormalizedAiFields(settings: Settings): Settings {
  const aiSelectableModels = mergeAiSelectableModels(settings.aiSelectableModels);
  const base = { ...settings, aiSelectableModels };
  const aiProvider = base.aiProvider;
  const mergedByProvider = mergeAiModelsByProvider(
    base.aiModelsByProvider,
    base,
  );
  if (base.aiModel) {
    mergedByProvider[aiProvider] = coerceModelForProvider(
      aiProvider,
      base.aiModel,
      base,
    );
  }
  const aiModel = coerceModelForProvider(
    aiProvider,
    mergedByProvider[aiProvider],
    base,
  );
  mergedByProvider[aiProvider] = aiModel;
  return {
    ...base,
    aiProvider,
    aiModel,
    aiModelsByProvider: mergedByProvider,
  };
}

/** Coerce AI fields and fill per-provider defaults for older workspaces. */
export function normalizeSettings(settings: Settings): Settings {
  return withNormalizedAiFields(settings);
}

export function settingsPatchForAiProvider(
  nextProvider: AiProvider,
  current: Settings,
): Partial<Settings> {
  const normalized = withNormalizedAiFields(current);
  const byProvider = mergeAiModelsByProvider(
    normalized.aiModelsByProvider,
    normalized,
  );
  const aiModel = byProvider[nextProvider];
  return {
    aiProvider: nextProvider,
    aiModel,
    aiModelsByProvider: byProvider,
  };
}

export function settingsPatchForAiModel(
  provider: AiProvider,
  modelId: string,
  current: Settings,
): Partial<Settings> {
  const normalized = withNormalizedAiFields(current);
  const byProvider = mergeAiModelsByProvider(
    normalized.aiModelsByProvider,
    normalized,
  );
  const aiModel = coerceModelForProvider(provider, modelId, normalized);
  byProvider[provider] = aiModel;
  return {
    aiModel: normalized.aiProvider === provider ? aiModel : normalized.aiModel,
    aiModelsByProvider: byProvider,
  };
}

export function settingsPatchForSelectableModels(
  provider: AiProvider,
  models: AiSelectableModel[],
  current: Settings,
): Partial<Settings> {
  const aiSelectableModels = {
    ...mergeAiSelectableModels(current.aiSelectableModels),
    [provider]: models,
  };
  const draft: Settings = { ...current, aiSelectableModels };
  return withNormalizedAiFields(draft);
}

export function settingsPatchRestoreBuiltinModels(
  provider: AiProvider,
  current: Settings,
): Partial<Settings> {
  return settingsPatchForSelectableModels(
    provider,
    builtinSelectableModelsForProvider(provider),
    current,
  );
}

export function ensureTaskTags(ws: WorkspaceSnapshot): WorkspaceSnapshot {
  if (ws.taskTags?.length) return ws;
  return {
    ...ws,
    taskTags: DEFAULT_TASK_TAGS.map((t) => ({ ...t })),
  };
}

export function ensureNoteTags(ws: WorkspaceSnapshot): WorkspaceSnapshot {
  if (ws.noteTags) return ws;
  return { ...ws, noteTags: [] };
}

export function normalizeWorkspaceSnapshot(
  ws: WorkspaceSnapshot,
): WorkspaceSnapshot {
  return ensureNoteTags(ensureTaskTags(ws));
}

export function createEmptyWorkspace(): WorkspaceSnapshot {
  const now = new Date().toISOString();
  return {
    manifest: { version: 1, lastModified: now },
    settings: normalizeSettings({ ...DEFAULT_SETTINGS }),
    assignees: [],
    taskTags: DEFAULT_TASK_TAGS.map((t) => ({ ...t })),
    noteTags: [],
    inboundTasks: [],
    outboundTasks: [],
    links: [],
    notesIndex: [],
    noteBodies: {},
    scheduleEvents: [],
    askHistory: [],
  };
}

export function createExampleWorkspace(): WorkspaceSnapshot {
  const ws = createEmptyWorkspace();
  const now = new Date().toISOString();
  const assignee: Assignee = {
    id: "a0000000-0000-4000-8000-000000000001",
    name: "You",
    color: "#8b7355",
  };
  ws.assignees = [assignee];
  ws.outboundTasks = [
    {
      id: "b0000000-0000-4000-8000-000000000001",
      direction: "outbound",
      title: "Ship Q3 report",
      status: "in_progress",
      urgency: 4,
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      deliveryDate: new Date(Date.now() + 5 * 86400000)
        .toISOString()
        .slice(0, 10),
      assigneeId: assignee.id,
      backlog: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
  ws.inboundTasks = [
    {
      id: "c0000000-0000-4000-8000-000000000001",
      direction: "inbound",
      title: "Request: budget approval",
      status: "todo",
      urgency: 3,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      backlog: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
  ws.links = [
    {
      inboundTaskId: ws.inboundTasks[0]!.id,
      outboundTaskId: ws.outboundTasks[0]!.id,
    },
  ];
  return ws;
}
