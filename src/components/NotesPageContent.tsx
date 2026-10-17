"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { NoteEditor } from "@/components/NoteEditor";
import { NotesSidebar } from "@/components/NotesSidebar";
import { NotesSidebarToggle } from "@/components/NotesSidebarToggle";
import type { NoteMeta } from "@/lib/types/schemas";
import {
  defaultNoteTitle,
  uniqueNoteTitle,
} from "@/lib/notes/default-title";
import {
  filterNotesByList,
  noteIsArchived,
} from "@/lib/notes/filter-notes";
import {
  NOTES_SIDEBAR_PANEL_ID,
  readNotesSidebarCollapsedFromStorage,
  subscribeNotesSidebarCollapsed,
  toggleNotesSidebarCollapsedInStorage,
} from "@/lib/notes/sidebar-preference";

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
  const reorderNoteTags = useWorkspaceStore((s) => s.reorderNoteTags);
  const archiveNote = useWorkspaceStore((s) => s.archiveNote);
  const unarchiveNote = useWorkspaceStore((s) => s.unarchiveNote);
  const deleteNote = useWorkspaceStore((s) => s.deleteNote);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeNotesSidebarCollapsed,
    () => readNotesSidebarCollapsedFromStorage(),
    () => false,
  );
  const sidebarPanelRef = useRef<HTMLDivElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  /** Note id that should open in Write mode once (set on create). */
  const [writeOnOpenId, setWriteOnOpenId] = useState<string | null>(null);

  const toggleSidebarCollapsed = useCallback(() => {
    const wasCollapsed = readNotesSidebarCollapsedFromStorage();
    toggleNotesSidebarCollapsedInStorage();

    if (!wasCollapsed) {
      const panel = sidebarPanelRef.current;
      const active = document.activeElement;
      if (
        panel &&
        active instanceof HTMLElement &&
        panel.contains(active)
      ) {
        sidebarToggleRef.current?.focus();
      }
    }
  }, []);

  const activeNotes = useMemo(() => {
    if (!snapshot) return [];
    return notesByLatest(filterNotesByList(snapshot.notesIndex, "active"));
  }, [snapshot]);

  const archivedNotes = useMemo(() => {
    if (!snapshot) return [];
    return notesByLatest(filterNotesByList(snapshot.notesIndex, "archived"));
  }, [snapshot]);

  const allNotes = useMemo(
    () => [...activeNotes, ...archivedNotes],
    [activeNotes, archivedNotes],
  );

  const selectNote = useCallback(
    (title: string | null) => {
      setSelectedTitle(title);
      if (title) {
        router.replace(`/notes?title=${encodeURIComponent(title)}`, {
          scroll: false,
        });
      } else {
        router.replace("/notes", { scroll: false });
      }
    },
    [router],
  );

  useEffect(() => {
    if (!urlNoteTitle || !snapshot) return;
    if (allNotes.some((n) => n.title === urlNoteTitle)) return;
    const next = activeNotes[0]?.title ?? archivedNotes[0]?.title ?? null;
    selectNote(next);
  }, [urlNoteTitle, snapshot, allNotes, activeNotes, archivedNotes, selectNote]);

  if (!snapshot) return null;

  const titleFromUrl =
    urlNoteTitle && allNotes.some((n) => n.title === urlNoteTitle)
      ? urlNoteTitle
      : null;
  const titleFromState =
    selectedTitle && allNotes.some((n) => n.title === selectedTitle)
      ? selectedTitle
      : null;

  const effectiveSelectedTitle =
    titleFromUrl ??
    titleFromState ??
    activeNotes[0]?.title ??
    archivedNotes[0]?.title ??
    null;

  const selected = allNotes.find((n) => n.title === effectiveSelectedTitle);
  const selectedIsArchived = selected ? noteIsArchived(selected) : false;

  const handleCreateNote = () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const title = defaultNoteTitle(
      snapshot.notesIndex.map((n) => n.title),
    );
    void upsertNote(
      {
        id,
        title,
        tagIds: [],
        createdAt: now,
        updatedAt: now,
        archived: false,
      },
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
    const wasArchived = noteIsArchived(selected);
    void deleteNote(selected.id);
    const pool = wasArchived ? archivedNotes : activeNotes;
    const remaining = pool.filter((n) => n.id !== selected.id);
    selectNote(remaining[0]?.title ?? null);
    if (writeOnOpenId === selected.id) setWriteOnOpenId(null);
  };

  const handleArchiveNote = () => {
    if (!selected) return;
    void archiveNote(selected.id);
    const remaining = activeNotes.filter((n) => n.id !== selected.id);
    selectNote(remaining[0]?.title ?? selected.title);
    if (writeOnOpenId === selected.id) setWriteOnOpenId(null);
  };

  const handleNoteTagIdsChange = async (tagIds: string[]) => {
    if (!selected) return;
    const now = new Date().toISOString();
    await upsertNote(
      { ...selected, tagIds, updatedAt: now },
      snapshot.noteBodies?.[selected.id] ?? "",
    );
  };

  const handleUnarchiveNote = () => {
    if (!selected) return;
    void unarchiveNote(selected.id);
    selectNote(selected.title);
    if (writeOnOpenId === selected.id) setWriteOnOpenId(null);
  };

  return (
    <section
      aria-labelledby="notes-page-heading"
      className="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col overflow-hidden md:h-[calc(100dvh-7.5rem)]"
    >
      <h2 id="notes-page-heading" className="sr-only">
        Notes
      </h2>
      <header className="mb-4 shrink-0">
        <NotesSidebarToggle
          ref={sidebarToggleRef}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebarCollapsed}
        />
      </header>
      <div
        className={`flex min-h-0 flex-1 flex-col items-stretch transition-[gap] duration-300 ease-in-out motion-reduce:transition-none lg:flex-row ${
          sidebarCollapsed ? "gap-0" : "gap-4 lg:gap-5"
        }`}
      >
        <div
          ref={sidebarPanelRef}
          id={NOTES_SIDEBAR_PANEL_ID}
          className={`grid min-h-0 w-full shrink-0 overflow-hidden transition-[grid-template-rows,width,opacity,transform] duration-300 ease-in-out motion-reduce:transform-none motion-reduce:transition-none lg:max-h-full lg:self-start lg:grid-rows-[1fr] ${
            sidebarCollapsed
              ? "grid-rows-[0fr] -translate-x-2 opacity-0 lg:w-0"
              : "grid-rows-[1fr] max-h-[min(42dvh,22rem)] translate-x-0 opacity-100 lg:max-h-full lg:w-64"
          }`}
          aria-hidden={sidebarCollapsed}
          inert={sidebarCollapsed ? true : undefined}
        >
          <div className="min-h-0 max-h-full overflow-y-auto lg:w-64">
            <NotesSidebar
              activeNotes={activeNotes}
              archivedNotes={archivedNotes}
              noteTags={snapshot.noteTags}
              selectedTitle={effectiveSelectedTitle}
              noteBodies={snapshot.noteBodies}
              archivedOpen={archivedOpen}
              onArchivedOpenChange={setArchivedOpen}
              onReorderNoteTags={(orderedIds) => {
                void reorderNoteTags(orderedIds);
              }}
              onSelectNote={(title, id) => {
                selectNote(title);
                if (id !== writeOnOpenId) setWriteOnOpenId(null);
              }}
              onCreateNote={handleCreateNote}
            />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col lg:min-h-[18rem]">
          {selected ? (
            <NoteEditor
              className="min-h-0"
              note={selected}
              body={snapshot.noteBodies?.[selected.id] ?? ""}
              noteTags={snapshot.noteTags}
              tagIds={selected.tagIds ?? []}
              onTagIdsChange={handleNoteTagIdsChange}
              initialPreview={selected.id !== writeOnOpenId}
              onSave={handleSaveNote}
              onArchive={!selectedIsArchived ? handleArchiveNote : undefined}
              onUnarchive={selectedIsArchived ? handleUnarchiveNote : undefined}
              onDelete={handleDeleteNote}
            />
          ) : (
            <p className="text-sm text-ink-muted">Select or create a note.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export const NotesView = NotesPageContent;
