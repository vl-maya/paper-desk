import type {
  AiSelectableModel,
  AiSelectableModelsByProvider,
  Settings,
} from "@/lib/types/schemas";

export type AiProvider = "claude" | "cursor";

export type AiModelTier = "fast" | "medium" | "high";

export type AiModelOption = {
  id: string;
  label: string;
  tier?: AiModelTier;
  tierLabel?: string;
  isNew?: boolean;
  featured?: boolean;
  searchTerms?: string;
  cliModel?: string;
};

export type AiModelGroup = {
  id: string;
  label: string;
  models: AiModelOption[];
};

export type AiModelCatalog = {
  featured?: AiModelOption[];
  groups: AiModelGroup[];
};

export const BUILTIN_CLAUDE_MODEL_CATALOG: AiModelCatalog = {
  groups: [
    {
      id: "claude",
      label: "Claude models",
      models: [
        {
          id: "haiku",
          label: "Haiku 4.5",
          tier: "fast",
          tierLabel: "Fast",
          cliModel: "claude-haiku-4-5",
        },
        {
          id: "sonnet",
          label: "Sonnet 5",
          tier: "medium",
          tierLabel: "Medium",
          cliModel: "claude-sonnet-4-6",
        },
        {
          id: "opus",
          label: "Opus 5.5",
          tier: "high",
          tierLabel: "High",
          cliModel: "claude-opus-4-6",
        },
        {
          id: "fable",
          label: "Fable 5",
          tier: "high",
          tierLabel: "High",
          cliModel: "claude-fable-5-1",
        },
      ],
    },
  ],
};

export const BUILTIN_CURSOR_MODEL_CATALOG: AiModelCatalog = {
  featured: [
    {
      id: "auto-cost",
      label: "Auto",
      featured: true,
      cliModel: "auto",
    },
  ],
  groups: [
    {
      id: "models",
      label: "Models",
      models: [
        {
          id: "grok-4.7-high-fast",
          label: "Grok 4.7",
          tierLabel: "High Fast",
          cliModel: "grok-4.7-high-fast",
        },
        {
          id: "grok-4.6-high-fast",
          label: "Grok 4.6",
          tierLabel: "High Fast",
          cliModel: "grok-4.6-high-fast",
        },
        {
          id: "composer-2.5-fast",
          label: "Composer 2.5",
          tierLabel: "Fast",
          cliModel: "composer-2.5-fast",
        },
        {
          id: "claude-opus-5-5-medium",
          label: "Claude Opus 5.5",
          tierLabel: "Medium",
          cliModel: "claude-opus-5-5-medium",
        },
        {
          id: "gpt-5.6-sol-medium",
          label: "GPT-5.6 Sol",
          tierLabel: "Medium",
          cliModel: "gpt-5.6-sol-medium",
        },
        {
          id: "claude-fable-5-1-high",
          label: "Claude Fable 5.1",
          tierLabel: "High",
          cliModel: "claude-fable-5-1-thinking-high",
        },
        {
          id: "gemini-3.8-flash-high",
          label: "Gemini 3.8 Flash",
          tierLabel: "High",
          cliModel: "gemini-3.8-flash-high",
        },
        {
          id: "muse-spark-1.3-high",
          label: "Muse Spark 1.3",
          tierLabel: "High",
          cliModel: "muse-spark-1.3-high",
        },
      ],
    },
  ],
};

/** @deprecated Use settings-backed catalogs; kept for tests/migration */
export const CLAUDE_MODEL_CATALOG = BUILTIN_CLAUDE_MODEL_CATALOG;
/** @deprecated Use settings-backed catalogs */
export const CURSOR_MODEL_CATALOG = BUILTIN_CURSOR_MODEL_CATALOG;

const LEGACY_CURSOR_MODEL_IDS: Record<string, string> = {
  auto: "auto-cost",
  composer: "composer-2.5-fast",
  "gpt-5": "gpt-5.6-sol-medium",
  "claude-sonnet": "claude-opus-5-5-medium",
};

function flattenCatalog(catalog: AiModelCatalog): AiModelOption[] {
  const featured = catalog.featured ?? [];
  const grouped = catalog.groups.flatMap((g) => g.models);
  return [...featured, ...grouped];
}

function catalogToSelectableModels(catalog: AiModelCatalog): AiSelectableModel[] {
  return flattenCatalog(catalog).map((m) => ({
    id: m.id,
    label: m.label,
    cliModel: m.cliModel,
    tierLabel: m.tierLabel,
    featured: m.featured,
  }));
}

export function builtinSelectableModelsForProvider(
  provider: AiProvider,
): AiSelectableModel[] {
  const catalog =
    provider === "claude"
      ? BUILTIN_CLAUDE_MODEL_CATALOG
      : BUILTIN_CURSOR_MODEL_CATALOG;
  return catalogToSelectableModels(catalog);
}

export function defaultAiSelectableModels(): AiSelectableModelsByProvider {
  return {
    claude: builtinSelectableModelsForProvider("claude"),
    cursor: builtinSelectableModelsForProvider("cursor"),
  };
}

export function sanitizeSelectableModels(
  models: AiSelectableModel[] | undefined,
): AiSelectableModel[] {
  if (!models?.length) return [];
  const seen = new Set<string>();
  const out: AiSelectableModel[] = [];
  for (const row of models) {
    const id = row.id.trim();
    const label = row.label.trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      cliModel: row.cliModel?.trim() || undefined,
      tierLabel: row.tierLabel?.trim() || undefined,
      featured: row.featured,
    });
  }
  return out;
}

export function selectableModelsForProvider(
  settings: Pick<Settings, "aiSelectableModels"> | null | undefined,
  provider: AiProvider,
): AiSelectableModel[] {
  const stored = sanitizeSelectableModels(
    settings?.aiSelectableModels?.[provider],
  );
  if (stored.length) return stored;
  return builtinSelectableModelsForProvider(provider);
}

export function selectableToModelOption(m: AiSelectableModel): AiModelOption {
  return {
    id: m.id,
    label: m.label,
    tierLabel: m.tierLabel,
    featured: m.featured,
    cliModel: m.cliModel,
  };
}

export function modelCatalogFromSelectableModels(
  models: AiSelectableModel[],
): AiModelCatalog {
  const options = models.map(selectableToModelOption);
  const featured = options.filter((m) => m.featured);
  const rest = options.filter((m) => !m.featured);
  if (!rest.length) {
    return { featured, groups: [] };
  }
  return {
    featured: featured.length ? featured : undefined,
    groups: [{ id: "models", label: "Models", models: rest }],
  };
}

export function modelCatalogForSettings(
  settings: Pick<Settings, "aiSelectableModels"> | null | undefined,
  provider: AiProvider,
): AiModelCatalog {
  return modelCatalogFromSelectableModels(
    selectableModelsForProvider(settings, provider),
  );
}

export const CLAUDE_MODELS = flattenCatalog(BUILTIN_CLAUDE_MODEL_CATALOG);
export const CURSOR_MODELS = flattenCatalog(BUILTIN_CURSOR_MODEL_CATALOG);

/** @deprecated Use modelCatalogForSettings */
export function modelCatalogForProvider(provider: AiProvider): AiModelCatalog {
  return provider === "claude"
    ? BUILTIN_CLAUDE_MODEL_CATALOG
    : BUILTIN_CURSOR_MODEL_CATALOG;
}

export function modelsForProvider(
  provider: AiProvider,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): AiModelOption[] {
  if (settings) {
    return selectableModelsForProvider(settings, provider).map(
      selectableToModelOption,
    );
  }
  return flattenCatalog(modelCatalogForProvider(provider));
}

export function defaultModelForProvider(
  provider: AiProvider,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): string {
  const models = selectableModelsForProvider(settings ?? null, provider);
  const preferred = provider === "claude" ? "sonnet" : "auto-cost";
  if (models.some((m) => m.id === preferred)) return preferred;
  return models[0]?.id ?? (provider === "claude" ? "sonnet" : "auto-cost");
}

export function normalizeModelId(
  provider: AiProvider,
  modelId?: string | null,
): string {
  const raw = (modelId ?? "").trim();
  if (!raw) return defaultModelForProvider(provider);
  if (provider === "cursor") {
    return LEGACY_CURSOR_MODEL_IDS[raw] ?? raw;
  }
  return raw;
}

export function coerceModelForProvider(
  provider: AiProvider,
  modelId?: string | null,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): string {
  const normalized = normalizeModelId(provider, modelId);
  const options = selectableModelsForProvider(settings ?? null, provider);
  if (options.some((m) => m.id === normalized)) return normalized;
  return defaultModelForProvider(provider, settings);
}

export function resolveSelectableModel(
  provider: AiProvider,
  modelId?: string | null,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): AiSelectableModel | undefined {
  const id = normalizeModelId(provider, modelId);
  return selectableModelsForProvider(settings ?? null, provider).find(
    (m) => m.id === id,
  );
}

export function resolveModelOption(
  provider: AiProvider,
  modelId?: string | null,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): AiModelOption | undefined {
  const row = resolveSelectableModel(provider, modelId, settings);
  return row ? selectableToModelOption(row) : undefined;
}

export function resolveModelLabel(
  provider: AiProvider,
  modelId?: string | null,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): string {
  return resolveModelOption(provider, modelId, settings)?.label ?? modelId ?? "—";
}

export function modelMatchesQuery(model: AiModelOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    model.label,
    model.id,
    model.tierLabel,
    model.searchTerms,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterModelCatalog(
  catalog: AiModelCatalog,
  query: string,
): AiModelCatalog {
  const featured = (catalog.featured ?? []).filter((m) =>
    modelMatchesQuery(m, query),
  );
  const groups = catalog.groups
    .map((group) => ({
      ...group,
      models: group.models.filter((m) => modelMatchesQuery(m, query)),
    }))
    .filter((group) => group.models.length > 0);
  return { featured, groups };
}

export function claudeModelFlag(model: string): string {
  const id = normalizeModelId("claude", model);
  const map: Record<string, string> = {
    haiku: "claude-haiku-4-5",
    sonnet: "claude-sonnet-4-6",
    opus: "claude-opus-4-6",
    fable: "claude-fable-5-1",
  };
  return map[id] ?? id;
}

export function cursorModelCliFlag(model: string): string {
  const id = normalizeModelId("cursor", model);
  const map: Record<string, string> = {
    "auto-cost": "auto",
    "composer-2.5-fast": "composer-2.5-fast",
    "grok-4.7-high-fast": "grok-4.7-high-fast",
    "grok-4.6-high-fast": "grok-4.6-high-fast",
    "claude-opus-5-5-medium": "claude-opus-5-5-medium",
    "gpt-5.6-sol-medium": "gpt-5.6-sol-medium",
    "claude-fable-5-1-high": "claude-fable-5-1-thinking-high",
    "gemini-3.8-flash-high": "gemini-3.8-flash-high",
    "muse-spark-1.3-high": "muse-spark-1.3-high",
  };
  return map[id] ?? id;
}

export function resolveCliModelArg(
  provider: AiProvider,
  modelId: string,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): string {
  const row = resolveSelectableModel(provider, modelId, settings);
  if (row?.cliModel) return row.cliModel;
  if (provider === "claude") return claudeModelFlag(modelId);
  return cursorModelCliFlag(modelId);
}

export type AiModelsByProvider = Partial<Record<AiProvider, string>>;

export function defaultAiModelsByProvider(
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): Record<AiProvider, string> {
  return {
    claude: defaultModelForProvider("claude", settings),
    cursor: defaultModelForProvider("cursor", settings),
  };
}

export function mergeAiModelsByProvider(
  stored?: AiModelsByProvider | null,
  settings?: Pick<Settings, "aiSelectableModels"> | null,
): Record<AiProvider, string> {
  const defaults = defaultAiModelsByProvider(settings);
  return {
    claude: coerceModelForProvider(
      "claude",
      stored?.claude ?? defaults.claude,
      settings,
    ),
    cursor: coerceModelForProvider(
      "cursor",
      stored?.cursor ?? defaults.cursor,
      settings,
    ),
  };
}

export function mergeAiSelectableModels(
  stored?: AiSelectableModelsByProvider | null,
): AiSelectableModelsByProvider {
  const builtins = defaultAiSelectableModels();
  return {
    claude: sanitizeSelectableModels(stored?.claude).length
      ? sanitizeSelectableModels(stored?.claude)
      : builtins.claude,
    cursor: sanitizeSelectableModels(stored?.cursor).length
      ? sanitizeSelectableModels(stored?.cursor)
      : builtins.cursor,
  };
}
