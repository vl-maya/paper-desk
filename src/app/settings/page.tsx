"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { SortPreset, TaskTag } from "@/lib/types/schemas";
import { AiModelCatalogEditor } from "@/components/AiModelCatalogEditor";
import { AiModelPicker } from "@/components/AiModelPicker";
import { modelCatalogForSettings, type AiProvider } from "@/lib/ai/providers";
import {
  settingsPatchForAiModel,
  settingsPatchForAiProvider,
} from "@/lib/workspace/defaults";

const settingsFieldBase =
  "h-9 text-sm border border-paper-line rounded box-border";
const settingsControl = `${settingsFieldBase} bg-card`;
const settingsPrimaryButton =
  `${settingsFieldBase} inline-flex items-center justify-center px-4 border-accent bg-accent text-white shrink-0`;
const settingsFieldLabel = "block text-sm mb-1 leading-tight";

export default function SettingsPage() {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const updateSettings = useWorkspaceStore((s) => s.updateSettings);
  const upsertAssignee = useWorkspaceStore((s) => s.upsertAssignee);
  const removeAssignee = useWorkspaceStore((s) => s.removeAssignee);
  const upsertTaskTag = useWorkspaceStore((s) => s.upsertTaskTag);
  const removeTaskTag = useWorkspaceStore((s) => s.removeTaskTag);
  const initServerWorkspace = useWorkspaceStore((s) => s.initServerWorkspace);
  const changeSaveFolder = useWorkspaceStore((s) => s.changeSaveFolder);
  const ioMode = useWorkspaceStore((s) => s.ioMode);
  const serverRoot = useWorkspaceStore((s) => s.serverRoot);
  const linkedFolderName = useWorkspaceStore((s) => s.linkedFolderName);
  const [name, setName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#78716c");
  const [editingTag, setEditingTag] = useState<TaskTag | null>(null);
  const [pendingRemove, setPendingRemove] = useState<
    | { kind: "tag"; id: string; label: string }
    | { kind: "assignee"; id: string; label: string }
    | null
  >(null);

  if (!snapshot) return null;

  const s = snapshot.settings;

  return (
    <div className="max-w-xl space-y-8">
      <ConfirmDeleteModal
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          if (!pendingRemove) return;
          if (pendingRemove.kind === "tag") {
            void removeTaskTag(pendingRemove.id);
            if (editingTag?.id === pendingRemove.id) {
              setEditingTag(null);
              setTagName("");
              setTagColor("#78716c");
            }
          } else {
            void removeAssignee(pendingRemove.id);
          }
        }}
        title={
          pendingRemove?.kind === "tag" ? "Remove tag?" : "Remove assignee?"
        }
        description={
          pendingRemove?.kind === "tag"
            ? "Tasks using this tag will keep working but lose this label."
            : "Tasks assigned to this person will become unassigned."
        }
        itemLabel={pendingRemove?.label}
        confirmLabel="Remove"
      />
      <h2 className="font-serif text-2xl">Settings</h2>

      <section className="paper-card p-4 space-y-3">
        <h3 className="font-serif text-lg">Workspace</h3>
        <p className="text-sm text-ink-muted">
          Edits auto-save to the active location below. IndexedDB keeps a browser
          mirror. Use export for a one-time backup (not ongoing sync).
        </p>
        <div className="text-sm space-y-1">
          <p className="font-medium text-ink">Current location</p>
          {ioMode === "server" && serverRoot ? (
            <p className="font-mono text-xs text-ink-muted break-all">{serverRoot}</p>
          ) : ioMode === "fs-access" && linkedFolderName ? (
            <p className="text-ink-muted">
              Linked folder: <span className="font-medium text-ink">{linkedFolderName}</span>
            </p>
          ) : (
            <p className="text-ink-muted">
              Not connected — only the browser mirror is updated until the dev
              server or a linked folder is available.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-sm rounded border border-paper-line px-3 py-2"
            onClick={() => void changeSaveFolder()}
          >
            Change save folder…
          </button>
          <button
            type="button"
            className="text-sm rounded border border-paper-line px-3 py-2"
            onClick={() => void initServerWorkspace(false)}
          >
            Init empty (server data/)
          </button>
          <button
            type="button"
            className="text-sm rounded border border-paper-line px-3 py-2"
            onClick={() => void initServerWorkspace(true)}
          >
            Load example workspace
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Change save folder uses the File System Access API (Chromium). An empty
          folder receives a copy of your current workspace; a folder with{" "}
          <code className="text-xs">manifest.json</code> opens that workspace
          instead.
        </p>
        <button
          type="button"
          className="text-sm rounded border border-paper-line px-3 py-2"
          onClick={() => {
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `paper-desk-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export workspace JSON
        </button>
      </section>

      <section className="paper-card p-4 space-y-3">
        <h3 className="font-serif text-lg">WIP & sorting</h3>
        <label className="block text-sm">
          WIP limit
          <input
            type="number"
            min={1}
            className="mt-1 w-full border border-paper-line rounded px-2 py-1 bg-card"
            value={s.wipLimit}
            onChange={(e) =>
              void updateSettings({ wipLimit: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-sm">
          Default sort (inbound)
          <select
            className="mt-1 w-full border border-paper-line rounded px-2 py-1 bg-card"
            value={s.defaultSortInbound}
            onChange={(e) =>
              void updateSettings({
                defaultSortInbound: e.target.value as SortPreset,
              })
            }
          >
            <option value="urgency_desc">Urgency</option>
            <option value="due_asc">Due date</option>
            <option value="delivery_asc">Delivery</option>
            <option value="created_desc">Created</option>
          </select>
        </label>
        <label className="block text-sm">
          Default sort (outbound)
          <select
            className="mt-1 w-full border border-paper-line rounded px-2 py-1 bg-card"
            value={s.defaultSortOutbound}
            onChange={(e) =>
              void updateSettings({
                defaultSortOutbound: e.target.value as SortPreset,
              })
            }
          >
            <option value="urgency_desc">Urgency</option>
            <option value="due_asc">Due date</option>
            <option value="delivery_asc">Delivery</option>
            <option value="created_desc">Created</option>
          </select>
        </label>
      </section>

      <section className="paper-card p-4 space-y-3">
        <h3 className="font-serif text-lg">Task tags</h3>
        <p className="text-sm text-ink-muted">
          Tags are optional on tasks. Defaults: deliverables, deployment, request.
          Add your own and pick a color for each pill.
        </p>
        <ul className="space-y-2 text-sm">
          {snapshot.taskTags.map((tag) => (
            <li
              key={tag.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded border border-paper-line shrink-0"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden
                />
                <span>{tag.name}</span>
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-accent underline"
                  onClick={() => {
                    setEditingTag(tag);
                    setTagName(tag.name);
                    setTagColor(tag.color);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-red-800 underline"
                  onClick={() =>
                    setPendingRemove({
                      kind: "tag",
                      id: tag.id,
                      label: tag.name,
                    })
                  }
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="min-w-0">
            <span className={settingsFieldLabel}>
              {editingTag ? "Edit tag name" : "New tag name"}
            </span>
            <input
              className={`${settingsControl} w-full px-2`}
              placeholder="e.g. incident"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
            />
          </label>
          <label>
            <span className={settingsFieldLabel}>Color</span>
            <input
              type="color"
              className={`${settingsControl} block w-9 cursor-pointer p-1`}
              value={tagColor}
              onChange={(e) => setTagColor(e.target.value)}
            />
          </label>
          <div>
            <span
              className={`${settingsFieldLabel} hidden sm:block invisible`}
              aria-hidden
            >
              Action
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={settingsPrimaryButton}
                onClick={() => {
                  if (!tagName.trim()) return;
                  void upsertTaskTag({
                    id: editingTag?.id ?? uuidv4(),
                    name: tagName.trim(),
                    color: tagColor,
                  });
                  setTagName("");
                  setTagColor("#78716c");
                  setEditingTag(null);
                }}
              >
                {editingTag ? "Save tag" : "Add tag"}
              </button>
              {editingTag && (
                <button
                  type="button"
                  className={`${settingsControl} inline-flex items-center justify-center px-4`}
                  onClick={() => {
                    setEditingTag(null);
                    setTagName("");
                    setTagColor("#78716c");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="paper-card p-4 space-y-3">
        <h3 className="font-serif text-lg">Assignees</h3>
        <ul className="space-y-1 text-sm">
          {snapshot.assignees.map((a) => (
            <li key={a.id} className="flex justify-between items-center">
              <span>{a.name}</span>
              <button
                type="button"
                className="text-xs text-red-800 underline"
                onClick={() =>
                  setPendingRemove({
                    kind: "assignee",
                    id: a.id,
                    label: a.name,
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 items-center">
          <input
            className={`${settingsControl} flex-1 min-w-0 px-2`}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className={settingsPrimaryButton}
            onClick={() => {
              if (!name.trim()) return;
              void upsertAssignee({ id: uuidv4(), name: name.trim() });
              setName("");
            }}
          >
            Add
          </button>
        </div>
      </section>

      <section className="paper-card p-4 space-y-3">
        <h3 className="font-serif text-lg">Selectable AI models</h3>
        <p className="text-sm text-ink-muted">
          Choose which models appear in the picker for each CLI provider. Add
          custom entries with an optional CLI <code className="text-xs">--model</code>{" "}
          value when the id differs from what the CLI expects.
        </p>
        <AiModelCatalogEditor
          settings={s}
          onPatch={(patch) => void updateSettings(patch)}
        />
      </section>

      <section className="paper-card p-4 space-y-3">
        <h3 className="font-serif text-lg">AI defaults</h3>
        <p className="text-sm text-ink-muted">
          Default provider and model for Ask desk. Each provider keeps its own
          model choice when you switch.
        </p>
        <label className="block text-sm">
          Provider
          <select
            className="mt-1 w-full border border-paper-line rounded px-2 py-1 bg-card"
            value={s.aiProvider}
            onChange={(e) =>
              void updateSettings(
                settingsPatchForAiProvider(
                  e.target.value as AiProvider,
                  s,
                ),
              )
            }
          >
            <option value="claude">Claude CLI</option>
            <option value="cursor">Cursor CLI</option>
          </select>
        </label>
        <label className="block text-sm">
          Model
          <AiModelPicker
            provider={s.aiProvider}
            catalog={modelCatalogForSettings(s, s.aiProvider)}
            settings={s}
            value={s.aiModel}
            onChange={(modelId) =>
              void updateSettings(
                settingsPatchForAiModel(s.aiProvider, modelId, s),
              )
            }
          />
        </label>
      </section>
    </div>
  );
}
