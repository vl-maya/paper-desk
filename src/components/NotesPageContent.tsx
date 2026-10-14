"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { NoteEditor } from "@/components/NoteEditor";
import { NotesSidebar } from "@/components/NotesSidebar";
import type { NoteMeta } from "@/lib/types/schemas";
import {
  defaultNoteTitle,
  uniqueNoteTitle,
} from "@/lib/notes/default-title";

function notesByLatest(notes: NoteMeta[]): NoteMeta[] {
  return [...notes].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function NotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlNoteTitle = searchParams.get("title");

  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const upsertNote = useWorkspaceStore((s) => s.upsertNote);
  const deleteNote = useWorkspaceStore((s) => s.deleteNote);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  /** Note id that should open in Write mode once (set on create). */
  const [writeOnOpenId, setWriteOnOpenId] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => (snapshot ? notesByLatest(snapshot.notesIndex) : []),
    [snapshot],
  );

  const selectNote = useCallback(
    (title: string | null) => {
      setSelectedTitle(title);
      if (title) {
        router.replace(
          `/notes?title=${encodeURIComponent(title)}`,
          { scroll: false },
        );
      } else {
        router.replace("/notes", { scroll: false });
      }
    },
    [router],
  );

  useEffect(() => {
    if (!urlNoteTitle || !snapshot) return;
    if (sortedNotes.some((n) => n.title === urlNoteTitle)) return;
    const next = sortedNotes[0]?.title ?? null;
    selectNote(next);
  }, [urlNoteTitle, snapshot, sortedNotes, selectNote]);

  if (!snapshot) return null;

  const titleFromUrl =
    urlNoteTitle && sortedNotes.some((n) => n.title === urlNoteTitle)
      ? urlNoteTitle
      : null;
  const titleFromState =
    selectedTitle && sortedNotes.some((n) => n.title === selectedTitle)
      ? selectedTitle
      : null;

  const effectiveSelectedTitle =
    titleFromUrl ?? titleFromState ?? sortedNotes[0]?.title ?? null;

  const selected = sortedNotes.find((n) => n.title === effectiveSelectedTitle);

  const handleCreateNote = () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const title = defaultNoteTitle(
      snapshot.notesIndex.map((n) => n.title),
    );
    void upsertNote(
      { id, title, createdAt: now, updatedAt: now },
      "",
    );
    setWriteOnOpenId(id);
    selectNote(title);
  };

  const handleSaveNote = async (rawTitle: string, content: string) => {
    if (!selected) return;
    const otherTitles = snapshot.notesIndex
      .filter((n) => n.id !== selected.id)
      .map((n) => n.title);
    const title = uniqueNoteTitle(rawTitle, otherTitles);
    const now = new Date().toISOString();
    await upsertNote(
      { ...selected, title, updatedAt: now },
      content,
    );
    if (title !== selected.title) {
      selectNote(title);
    }
  };

  const handleDeleteNote = () => {
    if (!selected) return;
    void deleteNote(selected.id);
    const remaining = sortedNotes.filter((n) => n.id !== selected.id);
    selectNote(remaining[0]?.title ?? null);
    if (writeOnOpenId === selected.id) setWriteOnOpenId(null);
  };

  return (
    <div>
      <h2 className="font-serif text-2xl mb-4">Notes</h2>
      <div className="flex flex-col lg:flex-row gap-6">
        <NotesSidebar
          notes={sortedNotes}
          selectedTitle={effectiveSelectedTitle}
          onSelectNote={(title, id) => {
            selectNote(title);
            if (id !== writeOnOpenId) setWriteOnOpenId(null);
          }}
          onCreateNote={handleCreateNote}
        />
        <div className="flex-1">
          {selected ? (
            <NoteEditor
              note={selected}
              body={snapshot.noteBodies?.[selected.id] ?? ""}
              initialPreview={selected.id !== writeOnOpenId}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
            />
          ) : (
            <p className="text-sm text-ink-muted">Select or create a note.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const NotesView = NotesPageContent;
