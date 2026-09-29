"use client";

import { useState } from "react";
import type { ScheduleEvent } from "@/lib/types/schemas";
import { AskAnswerMarkdown } from "@/components/AskAnswerMarkdown";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

function toDatetimeLocalValue(iso: string): string {
  if (!iso) return "";
  if (iso.length <= 10) return `${iso}T09:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleEventForm({
  event,
  isNew,
  onSave,
  onDelete,
  onCancel,
}: {
  event: ScheduleEvent;
  isNew?: boolean;
  onSave: (event: ScheduleEvent) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [start, setStart] = useState(toDatetimeLocalValue(event.start));
  const [end, setEnd] = useState(
    event.end ? toDatetimeLocalValue(event.end) : "",
  );
  const [notes, setNotes] = useState(event.notes ?? "");
  const [notesPreview, setNotesPreview] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !start) return;
        onSave({
          ...event,
          title: title.trim(),
          start,
          end: end || undefined,
          notes: notes.trim() || undefined,
        });
      }}
    >
      <h3 id="schedule-form-title" className="font-serif text-lg pr-6">
        {isNew ? "New event" : "Edit event"}
      </h3>
      <label className="block text-sm">
        Title
        <input
          className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Start
        <input
          type="datetime-local"
          className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        End (optional)
        <input
          type="datetime-local"
          className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <div className="block text-sm space-y-1">
        <span>Notes</span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs mt-1">
          <div className="flex gap-2">
            <button
              type="button"
              className={
                !notesPreview ? "underline font-medium" : "text-ink-muted"
              }
              onClick={() => setNotesPreview(false)}
            >
              Write
            </button>
            <button
              type="button"
              className={
                notesPreview ? "underline font-medium" : "text-ink-muted"
              }
              onClick={() => setNotesPreview(true)}
            >
              Preview
            </button>
          </div>
          <span className="text-ink-muted">
            Markdown supported (headings, lists, links, tables, **bold**).
          </span>
        </div>
        {notesPreview ? (
          <div className="mt-1 w-full min-h-[80px] border border-paper-line rounded p-3 bg-card text-sm">
            {notes.trim() ? (
              <AskAnswerMarkdown content={notes} />
            ) : (
              <p className="text-ink-muted italic">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Location, agenda, reminders…"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          className="rounded bg-accent px-4 py-2 text-sm text-white"
        >
          Save
        </button>
        {onCancel && (
          <button
            type="button"
            className="rounded border border-paper-line px-4 py-2 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="rounded border border-red-200 px-4 py-2 text-sm text-red-800 ml-auto"
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
          title="Delete event?"
          description="This calendar event will be removed permanently."
          itemLabel={title.trim() || "Untitled event"}
        />
      )}
    </form>
  );
}
