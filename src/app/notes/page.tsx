"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { NoteEditor } from "@/components/NoteEditor";
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

function NotesPageContent() {
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

  return (
    <div>
      <h2 className="font-serif text-2xl mb-4">Notes</h2>
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-56 shrink-0">
          <button
            type="button"
            className="w-full rounded bg-accent text-white text-sm py-2 mb-3"
            onClick={() => {
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
            }}
          >
            New note
          </button>
          <ul className="space-y-1">
            {sortedNotes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`w-full text-left text-sm px-2 py-1 rounded ${
                    effectiveSelectedTitle === n.title
                      ? "bg-accent/15"
                      : "hover:bg-paper-line/50"
                  }`}
                  onClick={() => {
                    selectNote(n.title);
                    if (n.id !== writeOnOpenId) setWriteOnOpenId(null);
                  }}
                >
                  {n.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex-1">
          {selected ? (
            <NoteEditor
              note={selected}
              body={snapshot.noteBodies?.[selected.id] ?? ""}
              initialPreview={selected.id !== writeOnOpenId}
              onSave={async (rawTitle, content) => {
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
              }}
              onDelete={() => {
                void deleteNote(selected.id);
                const remaining = sortedNotes.filter(
                  (n) => n.id !== selected.id,
                );
                selectNote(remaining[0]?.title ?? null);
                if (writeOnOpenId === selected.id) setWriteOnOpenId(null);
              }}
            />
          ) : (
            <p className="text-sm text-ink-muted">Select or create a note.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesPageContent />
    </Suspense>
  );
}
