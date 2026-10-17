"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { NoteMeta, NoteTag } from "@/lib/types/schemas";
import { NoteTagMultiSelect } from "@/components/NoteTagMultiSelect";
import { AskAnswerMarkdown } from "@/components/AskAnswerMarkdown";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { safeFormatDisplayDate } from "@/lib/dates/display";
import { NOTE_EDITOR_MIN_HEIGHT_PX } from "@/hooks/useAutoResizeTextarea";
import {
  readVimEnabledFromStorage,
  writeVimEnabledToStorage,
} from "@/lib/notes/vim-preference";

const NoteCodeMirrorEditor = dynamic(
  () =>
    import("@/components/NoteCodeMirrorEditor").then((m) => ({
      default: m.NoteCodeMirrorEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-0 flex-1 w-full rounded border border-paper-line bg-card text-sm text-ink-muted p-2 font-mono"
        style={{ minHeight: NOTE_EDITOR_MIN_HEIGHT_PX }}
      >
        Loading editor…
      </div>
    ),
  },
);

type SavePhase = "idle" | "saving" | "check" | "saved";

const SAVE_SPINNER_MIN_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function SaveSpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        opacity={0.25}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveCheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12l2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NoteEditor({
  note,
  body,
  noteTags,
  tagIds,
  onTagIdsChange,
  onSave,
  onArchive,
  onUnarchive,
  onDelete,
  initialPreview = true,
  className,
}: {
  note: NoteMeta;
  body: string;
  noteTags: NoteTag[];
  tagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void | Promise<void>;
  onSave: (title: string, content: string) => void | Promise<void>;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  /** When false, opens in Write mode (used for newly created notes). */
  initialPreview?: boolean;
  className?: string;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(body);
  const [preview, setPreview] = useState(initialPreview);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const [vimEnabled, setVimEnabled] = useState(false);

  useEffect(() => {
    setVimEnabled(readVimEnabledFromStorage());
  }, []);

  useEffect(() => {
    setTitle(note.title);
    setContent(body);
  }, [note.id, note.title, body]);

  useEffect(() => {
    setPreview(initialPreview);
  }, [note.id, initialPreview]);

  useEffect(() => {
    setSavePhase("idle");
  }, [note.id]);

  useEffect(() => {
    if (savePhase === "check") {
      const timer = window.setTimeout(() => setSavePhase("saved"), 500);
      return () => window.clearTimeout(timer);
    }
    if (savePhase === "saved") {
      const timer = window.setTimeout(() => setSavePhase("idle"), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [savePhase]);

  function setVimPreference(enabled: boolean) {
    setVimEnabled(enabled);
    writeVimEnabledToStorage(enabled);
  }

  const createdDate = safeFormatDisplayDate(note.createdAt);

  return (
    <div
      className={`paper-card flex min-h-0 flex-1 flex-col p-4 ${className ?? ""}`}
    >
      <div className="shrink-0 space-y-3">
        <div>
          <input
            className="w-full font-serif text-lg border-b border-paper-line bg-transparent pb-1 rounded px-1.5 -mx-1.5 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent selection:bg-accent/25 selection:text-ink transition-all caret-accent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Note title"
          />
          {createdDate && (
            <p className="text-xs text-ink-muted mt-1" title={note.createdAt}>
              Created {createdDate}
            </p>
          )}
        </div>
        <NoteTagMultiSelect
          tags={noteTags}
          value={tagIds}
          onChange={(next) => void onTagIdsChange(next)}
        />
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              className={!preview ? "underline font-medium" : "text-ink-muted"}
              onClick={() => setPreview(false)}
            >
              Write
            </button>
            <button
              type="button"
              className={preview ? "underline font-medium" : "text-ink-muted"}
              onClick={() => setPreview(true)}
            >
              Preview
            </button>
          </div>
          <span className="text-ink-muted">
            Markdown supported (headings, lists, links, tables, **bold**).
          </span>
        </div>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {preview ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-paper-line bg-card p-3 text-sm">
            {content.trim() ? (
              <AskAnswerMarkdown content={content} />
            ) : (
              <p className="text-ink-muted italic">Nothing to preview yet.</p>
            )}
          </div>
        ) : vimEnabled ? (
          <NoteCodeMirrorEditor
            value={content}
            resetKey={note.id}
            fillAvailable
            placeholder="Write in Markdown…"
            onChange={setContent}
          />
        ) : (
          <textarea
            className="note-write-textarea min-h-0 w-full flex-1 resize-none overflow-y-auto border border-paper-line rounded p-2 text-sm bg-card font-mono leading-relaxed caret-accent"
            style={{
              minHeight: NOTE_EDITOR_MIN_HEIGHT_PX,
              caretColor: "var(--accent)",
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write in Markdown…"
          />
        )}
      </div>

      {!preview && (
        <div className="mt-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-paper-line accent-accent"
              checked={vimEnabled}
              onChange={(e) => setVimPreference(e.target.checked)}
            />
            Vim
          </label>
          {vimEnabled && <span>Vim keys enabled.</span>}
        </div>
      )}

      <div className="-mx-4 mt-3 flex shrink-0 flex-wrap items-center gap-2 bg-card px-4">
        <button
          type="button"
          className="grid h-8 w-20 shrink-0 place-items-center rounded bg-accent text-sm text-white transition-colors disabled:opacity-80"
          disabled={savePhase !== "idle"}
          aria-busy={savePhase === "saving"}
          aria-live="polite"
          onClick={() => {
            void (async () => {
              setSavePhase("saving");
              const started = performance.now();
              try {
                await Promise.resolve(onSave(title, content));
                const remaining = SAVE_SPINNER_MIN_MS - (performance.now() - started);
                if (remaining > 0) await delay(remaining);
                setSavePhase("check");
              } catch {
                setSavePhase("idle");
              }
            })();
          }}
        >
          <span
            className={`col-start-1 row-start-1 inline-flex items-center justify-center ${
              savePhase === "idle" ? "" : "invisible"
            }`}
          >
            Save
          </span>
          <span
            className={`col-start-1 row-start-1 inline-flex items-center justify-center ${
              savePhase === "saving" ? "" : "invisible"
            }`}
          >
            <SaveSpinnerIcon />
            <span className="sr-only">Saving</span>
          </span>
          <span
            className={`col-start-1 row-start-1 inline-flex items-center justify-center ${
              savePhase === "check" ? "" : "invisible"
            }`}
          >
            <SaveCheckIcon />
            <span className="sr-only">Saved</span>
          </span>
          <span
            className={`col-start-1 row-start-1 inline-flex items-center justify-center ${
              savePhase === "saved" ? "" : "invisible"
            }`}
          >
            Saved
          </span>
        </button>
        {onArchive && (
          <button
            type="button"
            className="h-8 shrink-0 rounded border border-paper-line bg-card px-3 text-sm text-ink-muted transition-colors hover:bg-paper-line/40 hover:text-ink"
            onClick={onArchive}
          >
            Archive
          </button>
        )}
        {onUnarchive && (
          <button
            type="button"
            className="h-8 shrink-0 rounded border border-paper-line bg-card px-3 text-sm text-ink-muted transition-colors hover:bg-paper-line/40"
            onClick={onUnarchive}
          >
            Unarchive
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="text-sm text-red-800 underline"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete
          </button>
        )}
      </div>
      {onDelete && (
        <ConfirmDeleteModal
          open={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={onDelete}
          title="Delete note?"
          description="This note will be removed permanently from your workspace."
          itemLabel={title.trim() || "Untitled"}
        />
      )}
    </div>
  );
}
