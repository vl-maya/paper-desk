"use client";

import { useState } from "react";
import type { AiSelectableModel, Settings } from "@/lib/types/schemas";
import { selectableModelsForProvider, type AiProvider } from "@/lib/ai/providers";
import {
  settingsPatchForSelectableModels,
  settingsPatchRestoreBuiltinModels,
} from "@/lib/workspace/defaults";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

const fieldBase =
  "h-9 text-sm border border-paper-line rounded box-border";
const control = `${fieldBase} bg-card w-full px-2`;
const fieldLabel = "block text-sm mb-1 leading-tight";
const primaryBtn = `${fieldBase} inline-flex items-center justify-center px-4 border-accent bg-accent text-white shrink-0`;

function slugFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AiModelCatalogEditor({
  settings,
  onPatch,
}: {
  settings: Settings;
  onPatch: (patch: Partial<Settings>) => void | Promise<void>;
}) {
  const [editProvider, setEditProvider] = useState<AiProvider>("claude");
  const [editing, setEditing] = useState<AiSelectableModel | null>(null);
  const [label, setLabel] = useState("");
  const [id, setId] = useState("");
  const [cliModel, setCliModel] = useState("");
  const [tierLabel, setTierLabel] = useState("");
  const [featured, setFeatured] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<AiSelectableModel | null>(
    null,
  );

  const models = selectableModelsForProvider(settings, editProvider);

  const resetForm = () => {
    setEditing(null);
    setLabel("");
    setId("");
    setCliModel("");
    setTierLabel("");
    setFeatured(false);
  };

  const startEdit = (model: AiSelectableModel) => {
    setEditing(model);
    setLabel(model.label);
    setId(model.id);
    setCliModel(model.cliModel ?? "");
    setTierLabel(model.tierLabel ?? "");
    setFeatured(Boolean(model.featured));
  };

  const saveModel = () => {
    const nextLabel = label.trim();
    const nextId = (id.trim() || slugFromLabel(nextLabel)).trim();
    if (!nextLabel || !nextId) return;

    const entry: AiSelectableModel = {
      id: nextId,
      label: nextLabel,
      cliModel: cliModel.trim() || undefined,
      tierLabel: tierLabel.trim() || undefined,
      featured: featured || undefined,
    };

    const base = editing ? models.filter((m) => m.id !== editing.id) : models;
    const nextList = [...base.filter((m) => m.id !== nextId), entry];

    void onPatch(
      settingsPatchForSelectableModels(editProvider, nextList, settings),
    );
    resetForm();
  };

  const removeModel = (model: AiSelectableModel) => {
    const nextList = models.filter((m) => m.id !== model.id);
    void onPatch(
      settingsPatchForSelectableModels(editProvider, nextList, settings),
    );
    if (editing?.id === model.id) resetForm();
  };

  return (
    <div className="space-y-3">
      <ConfirmDeleteModal
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) removeModel(pendingRemove);
        }}
        title="Remove model?"
        description="It will no longer appear in the model picker for this provider."
        itemLabel={pendingRemove?.label}
        confirmLabel="Remove"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted">Edit list for</span>
        <select
          className={`${fieldBase} bg-card px-2`}
          value={editProvider}
          onChange={(e) => {
            setEditProvider(e.target.value as AiProvider);
            resetForm();
          }}
        >
          <option value="claude">Claude CLI</option>
          <option value="cursor">Cursor CLI</option>
        </select>
        <button
          type="button"
          className="text-sm rounded border border-paper-line px-3 py-1.5"
          onClick={() =>
            void onPatch(
              settingsPatchRestoreBuiltinModels(editProvider, settings),
            )
          }
        >
          Restore defaults
        </button>
      </div>

      <ul className="space-y-2 text-sm">
        {models.map((model) => (
          <li
            key={model.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-line/60 pb-2"
          >
            <span className="min-w-0">
              <span className="font-medium">{model.label}</span>
              <span className="ml-2 font-mono text-xs text-ink-muted">
                {model.id}
              </span>
              {model.tierLabel && (
                <span className="ml-2 text-xs text-ink-muted">
                  {model.tierLabel}
                </span>
              )}
              {model.featured && (
                <span className="ml-2 text-xs text-accent">Featured</span>
              )}
              {model.cliModel && (
                <span className="block text-xs text-ink-muted truncate">
                  CLI: {model.cliModel}
                </span>
              )}
            </span>
            <span className="flex gap-2 shrink-0">
              <button
                type="button"
                className="text-xs text-accent underline"
                onClick={() => startEdit(model)}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-xs text-red-800 underline"
                onClick={() => setPendingRemove(model)}
              >
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="min-w-0 sm:col-span-2">
          <span className={fieldLabel}>
            {editing ? "Edit display label" : "Display label"}
          </span>
          <input
            className={control}
            placeholder="e.g. Sonnet 5"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!editing && !id.trim()) {
                setId(slugFromLabel(e.target.value));
              }
            }}
          />
        </label>
        <label className="min-w-0">
          <span className={fieldLabel}>Id (stored in workspace)</span>
          <input
            className={control}
            placeholder="e.g. sonnet-5"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className={fieldLabel}>CLI model (optional)</span>
          <input
            className={control}
            placeholder="--model value"
            value={cliModel}
            onChange={(e) => setCliModel(e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className={fieldLabel}>Tier label (optional)</span>
          <input
            className={control}
            placeholder="e.g. Fast"
            value={tierLabel}
            onChange={(e) => setTierLabel(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          Featured (shown above list in picker, e.g. Auto)
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryBtn} onClick={saveModel}>
          {editing ? "Save model" : "Add model"}
        </button>
        {editing && (
          <button
            type="button"
            className={`${fieldBase} inline-flex items-center justify-center px-4 bg-card`}
            onClick={resetForm}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
