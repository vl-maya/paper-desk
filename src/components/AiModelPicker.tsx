"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  filterModelCatalog,
  type AiModelCatalog,
  resolveModelOption,
  type AiProvider,
} from "@/lib/ai/providers";
import type { Settings } from "@/lib/types/schemas";

function ModelRow({
  model,
  selected,
  onSelect,
}: {
  model: {
    id: string;
    label: string;
    tierLabel?: string;
    isNew?: boolean;
  };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper/80 ${
        selected ? "bg-paper/60" : ""
      }`}
      onClick={onSelect}
    >
      <span className="w-4 shrink-0 text-accent" aria-hidden>
        {selected ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1 truncate">{model.label}</span>
      {model.isNew && (
        <span className="shrink-0 rounded border border-paper-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
          New
        </span>
      )}
      {model.tierLabel && (
        <span className="shrink-0 text-xs text-ink-muted">{model.tierLabel}</span>
      )}
    </button>
  );
}

export function AiModelPicker({
  provider,
  catalog,
  settings,
  value,
  onChange,
  className,
  id: idProp,
}: {
  provider: AiProvider;
  catalog: AiModelCatalog;
  settings?: Pick<Settings, "aiSelectableModels"> | null;
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
  id?: string;
}) {
  const generatedId = useId();
  const controlId = idProp ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterModelCatalog(catalog, query),
    [catalog, query],
  );
  const selected = resolveModelOption(provider, value, settings);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, provider]);

  const pick = (modelId: string) => {
    onChange(modelId);
    setOpen(false);
  };

  const hasResults =
    (filtered.featured?.length ?? 0) > 0 ||
    filtered.groups.some((g) => g.models.length > 0);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        id={controlId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded border border-paper-line bg-card px-2 py-1.5 text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate text-left">
          {selected?.label ?? value}
          {selected?.tierLabel ? (
            <span className="ml-2 text-xs text-ink-muted">{selected.tierLabel}</span>
          ) : null}
        </span>
        <span className="text-xs text-ink-muted" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={controlId}
          className="absolute z-30 mt-1 max-h-80 w-full min-w-[16rem] overflow-hidden rounded border border-paper-line bg-card shadow-lg"
        >
          <div className="border-b border-paper-line p-2">
            <label className="sr-only" htmlFor={`${controlId}-search`}>
              Search models
            </label>
            <input
              ref={searchRef}
              id={`${controlId}-search`}
              type="search"
              placeholder="Search models"
              className="w-full rounded border border-paper-line bg-paper px-2 py-1.5 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {!hasResults && (
              <p className="px-3 py-2 text-sm text-ink-muted">No models match.</p>
            )}
            {(filtered.featured ?? []).map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                selected={value === model.id}
                onSelect={() => pick(model.id)}
              />
            ))}
            {filtered.groups.map((group) => (
              <div key={group.id}>
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {group.label}
                </p>
                {group.models.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    selected={value === model.id}
                    onSelect={() => pick(model.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
