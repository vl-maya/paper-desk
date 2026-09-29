"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { QueryTemplateChips } from "@/components/QueryTemplateChips";
import { AiModelPicker } from "@/components/AiModelPicker";
import {
  coerceModelForProvider,
  modelCatalogForSettings,
  type AiProvider,
} from "@/lib/ai/providers";
import {
  buildAiContext,
  runMechanicalQuery,
  type QueryTemplateId,
} from "@/lib/query/mechanical";
import { AskHistoryList } from "@/components/AskHistoryList";
import { startAiQuery } from "@/lib/ask/ask-query-runner";
import {
  selectAskRunnerBusy,
  useAskRunnerStore,
} from "@/lib/ask/ask-runner-store";

export default function AskPage() {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const addAskHistoryEntry = useWorkspaceStore((s) => s.addAskHistoryEntry);
  const archiveAskHistoryEntry = useWorkspaceStore(
    (s) => s.archiveAskHistoryEntry,
  );
  const [input, setInput] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askBusy = useAskRunnerStore(selectAskRunnerBusy);
  const [providerOverride, setProviderOverride] = useState<AiProvider | null>(
    null,
  );
  const [modelOverride, setModelOverride] = useState<string | null>(null);

  if (!snapshot) return null;

  const provider = providerOverride ?? snapshot.settings.aiProvider;
  const storedForProvider =
    snapshot.settings.aiModelsByProvider?.[provider] ??
    snapshot.settings.aiModel;
  const settings = snapshot.settings;
  const model = coerceModelForProvider(
    provider,
    modelOverride ?? storedForProvider,
    settings,
  );

  const onProviderChange = (next: AiProvider) => {
    setProviderOverride(next);
    const nextModel =
      settings.aiModelsByProvider?.[next] ?? settings.aiModel;
    setModelOverride(coerceModelForProvider(next, nextModel, settings));
  };

  const persistResponse = async (
    prompt: string,
    answer: string,
    source: "mechanical" | "ai",
    templateId?: QueryTemplateId,
  ) => {
    await addAskHistoryEntry({
      prompt,
      answer,
      source,
      templateId,
      ...(source === "ai"
        ? { provider, model }
        : {}),
    });
  };

  const runQuery = async (text: string, templateId?: QueryTemplateId) => {
    setError(null);
    const mechanical = runMechanicalQuery(snapshot, text, templateId);
    if (!useAi && mechanical.matched) {
      await persistResponse(text, mechanical.answer, "mechanical", templateId);
      return;
    }

    try {
      const context = buildAiContext(snapshot);
      await startAiQuery({
        prompt: text,
        context,
        provider,
        model,
        settings,
        templateId,
        mechanicalFallback: mechanical.matched ? mechanical.answer : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
      if (mechanical.matched) {
        await persistResponse(text, mechanical.answer, "mechanical", templateId);
      }
    }
  };

  const hasRunningHistory = (snapshot.askHistory ?? []).some(
    (e) => e.status === "running",
  );
  const queryInProgress = askBusy || hasRunningHistory;

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="font-serif text-2xl">Ask desk</h2>
        <Link
          href="/ask/archive"
          className="text-sm text-accent underline hover:text-accent/80"
        >
          Archived responses
        </Link>
      </div>
      <p className="text-sm text-ink-muted mb-4">
        Templates run locally first (no tokens). Each answer is saved below by
        day (newest first). Archive a response to hide it from this list.
      </p>

      <QueryTemplateChips
        onSelect={(id) => {
          setInput(id);
          void runQuery(id, id);
        }}
      />

      <div className="mt-6 space-y-3">
        <div className="paper-card p-3 grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            Provider
            <select
              className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 text-sm bg-card"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as AiProvider)}
            >
              <option value="claude">Claude CLI</option>
              <option value="cursor">Cursor CLI</option>
            </select>
          </label>
          <label className="block text-sm">
            Model
            <AiModelPicker
              provider={provider}
              catalog={modelCatalogForSettings(settings, provider)}
              settings={settings}
              value={model}
              onChange={(modelId) => setModelOverride(modelId)}
            />
          </label>
        </div>

        <textarea
          className="w-full min-h-[100px] border border-paper-line rounded p-3 text-sm bg-card"
          placeholder="Ask about statuses, deadlines, urgency…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
          />
          Use AI when mechanical match fails (or always when checked)
        </label>
        <button
          type="button"
          disabled={queryInProgress || !input.trim()}
          className="rounded bg-accent text-white px-4 py-2 text-sm disabled:opacity-50"
          onClick={() => void runQuery(input)}
        >
          {queryInProgress ? "Running…" : "Ask"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <AskHistoryList
        entries={snapshot.askHistory ?? []}
        settings={settings}
        filter="active"
        onArchive={(id) => void archiveAskHistoryEntry(id)}
      />
    </div>
  );
}
