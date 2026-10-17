"use client";

import Link from "next/link";
import { useMemo, useState, type DragEvent } from "react";
import type { NoteMeta, NoteTag } from "@/lib/types/schemas";
import { safeFormatDisplayDate } from "@/lib/dates/display";
import { filterNotesBySearch } from "@/lib/notes/filter-notes";
import { groupNotesByTags, type NoteTagGroup } from "@/lib/notes/group-notes";
import { tagPillStyle } from "@/lib/tasks/tag-display";

export type NotesSidebarProps = {
  activeNotes: NoteMeta[];
  archivedNotes: NoteMeta[];
  noteTags: NoteTag[];
  selectedTitle: string | null;
  onSelectNote: (title: string, noteId: string) => void;
  onCreateNote: () => void;
  onReorderNoteTags: (orderedIds: string[]) => void;
  noteBodies?: Record<string, string>;
  archivedOpen?: boolean;
  onArchivedOpenChange?: (open: boolean) => void;
  id?: string;
};

function NotesSearchInput({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label": string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full border border-paper-line rounded px-2 py-1.5 text-sm bg-card text-ink placeholder:text-ink-muted/80"
    />
  );
}

function NotesList({
  notes,
  selectedTitle,
  onSelectNote,
  emptyMessage,
}: {
  notes: NoteMeta[];
  selectedTitle: string | null;
  onSelectNote: (title: string, noteId: string) => void;
  emptyMessage: string;
}) {
  if (notes.length === 0) {
    return <p className="text-xs text-ink-muted py-1">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-1">
      {notes.map((n) => {
        const createdDate = safeFormatDisplayDate(n.createdAt);
        const isSelected = selectedTitle === n.title;

        return (
          <li key={n.id}>
            <button
              type="button"
              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                isSelected ? "bg-accent/15" : "hover:bg-paper-line/50"
              }`}
              onClick={() => onSelectNote(n.title, n.id)}
            >
              <span className="block text-sm font-medium truncate text-ink">
                {n.title}
              </span>
              {createdDate && (
                <span
                  className="block text-xs text-ink-muted mt-0.5"
                  title={n.createdAt}
                >
                  {createdDate}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TagGroupSection({
  group,
  selectedTitle,
  onSelectNote,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  group: NoteTagGroup;
  selectedTitle: string | null;
  onSelectNote: (title: string, noteId: string) => void;
  onDragStart: (tagId: string) => void;
  onDragOver: (e: DragEvent, tagId: string) => void;
  onDrop: (tagId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const isDraggable = Boolean(group.tag);
  const headerId = group.tag?.id ?? group.key;

  return (
    <details className="group/section border border-paper-line rounded-md" open>
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 text-xs font-semibold [&::-webkit-details-marker]:hidden"
        draggable={isDraggable}
        onDragStart={() => {
          if (group.tag) onDragStart(group.tag.id);
        }}
        onDragOver={(e) => {
          if (group.tag) onDragOver(e, group.tag.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (group.tag) onDrop(group.tag.id);
        }}
      >
        {isDraggable && (
          <span
            className="text-ink-muted cursor-grab active:cursor-grabbing select-none"
            aria-hidden
            title="Drag to reorder tags"
          >
            ⠿
          </span>
        )}
        {group.tag ? (
          <span
            className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0"
            style={tagPillStyle(group.tag.color)}
          >
            {group.label}
          </span>
        ) : (
          <span className="text-ink-muted uppercase tracking-wide">{group.label}</span>
        )}
        <span className="ml-auto text-ink-muted font-normal">{group.notes.length}</span>
        {isDraggable && (
          <span className="flex gap-0.5" onClick={(e) => e.preventDefault()}>
            <button
              type="button"
              className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
              aria-label="Move tag section up"
              disabled={!canMoveUp}
              onClick={onMoveUp}
            >
              ↑
            </button>
            <button
              type="button"
              className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
              aria-label="Move tag section down"
              disabled={!canMoveDown}
              onClick={onMoveDown}
            >
              ↓
            </button>
          </span>
        )}
      </summary>
      <div className="px-1 pb-2 pt-1 border-t border-paper-line/60">
        <NotesList
          notes={group.notes}
          selectedTitle={selectedTitle}
          onSelectNote={onSelectNote}
          emptyMessage="No notes."
        />
      </div>
      <span className="sr-only" id={`tag-group-${headerId}`}>
        {group.label}
      </span>
    </details>
  );
}

export function NotesSidebar({
  activeNotes,
  archivedNotes,
  noteTags,
  selectedTitle,
  onSelectNote,
  onCreateNote,
  onReorderNoteTags,
  noteBodies,
  archivedOpen = false,
  onArchivedOpenChange,
  id,
}: NotesSidebarProps) {
  const [activeSearch, setActiveSearch] = useState("");
  const [archivedSearch, setArchivedSearch] = useState("");
  const [dragTagId, setDragTagId] = useState<string | null>(null);

  const filteredActive = useMemo(
    () =>
      filterNotesBySearch(activeNotes, activeSearch, noteBodies, noteTags),
    [activeNotes, activeSearch, noteBodies, noteTags],
  );

  const filteredArchived = useMemo(
    () =>
      filterNotesBySearch(archivedNotes, archivedSearch, noteBodies, noteTags),
    [archivedNotes, archivedSearch, noteBodies, noteTags],
  );

  const tagGroups = useMemo(
    () => groupNotesByTags(filteredActive, noteTags),
    [filteredActive, noteTags],
  );

  const moveTag = (tagId: string, direction: -1 | 1) => {
    const ids = noteTags.map((t) => t.id);
    const idx = ids.indexOf(tagId);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= ids.length) return;
    const next = [...ids];
    [next[idx], next[nextIdx]] = [next[nextIdx]!, next[idx]!];
    onReorderNoteTags(next);
  };

  const handleDropOn = (targetTagId: string) => {
    if (!dragTagId || dragTagId === targetTagId) {
      setDragTagId(null);
      return;
    }
    const ids = noteTags.map((t) => t.id);
    const from = ids.indexOf(dragTagId);
    const to = ids.indexOf(targetTagId);
    if (from < 0 || to < 0) {
      setDragTagId(null);
      return;
    }
    const next = ids.filter((id) => id !== dragTagId);
    next.splice(to, 0, dragTagId);
    onReorderNoteTags(next);
    setDragTagId(null);
  };

  const taggedIds = noteTags.map((t) => t.id);

  return (
    <aside
      id={id}
      className="flex w-full shrink-0 flex-col gap-3 lg:w-64"
    >
      <div className="sticky top-0 z-10 shrink-0 bg-paper pb-1">
        <button
          type="button"
          className="w-full rounded bg-accent text-white text-sm py-2 font-medium transition-colors hover:bg-accent/90"
          onClick={onCreateNote}
        >
          New note
        </button>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Active notes
          </h3>
          <Link
            href="/settings#note-tags"
            className="text-[11px] text-accent underline shrink-0"
          >
            Manage tags
          </Link>
        </div>
        <NotesSearchInput
          value={activeSearch}
          onChange={setActiveSearch}
          placeholder="Search by title or tag…"
          aria-label="Search active notes"
        />
        {tagGroups.length === 0 ? (
          <p className="text-xs text-ink-muted py-1">
            {activeNotes.length === 0
              ? "No active notes yet."
              : "No matches."}
          </p>
        ) : (
          <div className="space-y-2">
            {tagGroups.map((group) => {
              const tagId = group.tag?.id;
              const tagIndex = tagId ? taggedIds.indexOf(tagId) : -1;
              return (
                <TagGroupSection
                  key={group.key}
                  group={group}
                  selectedTitle={selectedTitle}
                  onSelectNote={onSelectNote}
                  onDragStart={setDragTagId}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={handleDropOn}
                  onMoveUp={() => tagId && moveTag(tagId, -1)}
                  onMoveDown={() => tagId && moveTag(tagId, 1)}
                  canMoveUp={tagIndex > 0}
                  canMoveDown={tagIndex >= 0 && tagIndex < taggedIds.length - 1}
                />
              );
            })}
          </div>
        )}
      </section>

      <details
        className="group border-t border-paper-line pt-3"
        open={archivedOpen}
        onToggle={(e) => onArchivedOpenChange?.(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block text-sm transition-transform group-open:rotate-90"
            >
              ›
            </span>
            Archived notes
          </span>
          <span className="font-normal normal-case tracking-normal text-ink-muted/90">
            {archivedNotes.length}
          </span>
        </summary>
        <div className="mt-2 space-y-2">
          <NotesSearchInput
            value={archivedSearch}
            onChange={setArchivedSearch}
            placeholder="Search archived…"
            aria-label="Search archived notes"
          />
          <NotesList
            notes={filteredArchived}
            selectedTitle={selectedTitle}
            onSelectNote={onSelectNote}
            emptyMessage={
              archivedNotes.length === 0
                ? "No archived notes."
                : "No matches."
            }
          />
        </div>
      </details>
    </aside>
  );
}
