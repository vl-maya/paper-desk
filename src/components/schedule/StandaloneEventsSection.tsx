"use client";

import { useMemo, useState } from "react";
import { formatDisplayDateTime } from "@/lib/dates/display";
import type { ScheduleEvent } from "@/lib/types/schemas";
import {
  eventsByStartDesc,
  filterEventsBySearch,
} from "@/lib/schedule/filter-events";
import { ScheduleEventNotes } from "@/components/schedule/ScheduleEventNotes";

function EventsSearchInput({
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
      className="w-full max-w-md border border-paper-line rounded px-2 py-1.5 text-sm bg-card text-ink placeholder:text-ink-muted/80"
    />
  );
}

function EventRow({
  event,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  event: ScheduleEvent;
  onEdit: (event: ScheduleEvent) => void;
  onArchive?: (event: ScheduleEvent) => void;
  onUnarchive?: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
}) {
  return (
    <li className="paper-card px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{event.title}</p>
        <p className="text-xs text-ink-muted">
          {formatDisplayDateTime(event.start)}
          {event.end ? ` → ${formatDisplayDateTime(event.end)}` : ""}
        </p>
        {event.notes && (
          <div className="mt-1 text-xs">
            <ScheduleEventNotes content={event.notes} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          className="text-xs font-medium rounded px-2.5 py-1 bg-accent text-white hover:brightness-105"
          onClick={() => onEdit(event)}
        >
          Edit
        </button>
        {onArchive && (
          <button
            type="button"
            className="text-xs rounded border border-paper-line bg-card px-2.5 py-1 text-ink-muted transition-colors hover:bg-paper-line/40 hover:text-ink"
            onClick={() => onArchive(event)}
          >
            Archive
          </button>
        )}
        {onUnarchive && (
          <button
            type="button"
            className="text-xs rounded border border-paper-line bg-card px-2.5 py-1 text-ink transition-colors hover:bg-paper-line/40"
            onClick={() => onUnarchive(event)}
          >
            Unarchive
          </button>
        )}
        <button
          type="button"
          className="text-xs text-red-800 underline"
          onClick={() => onDelete(event)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function EventList({
  events,
  emptyMessage,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  events: ScheduleEvent[];
  emptyMessage: string;
  onEdit: (event: ScheduleEvent) => void;
  onArchive?: (event: ScheduleEvent) => void;
  onUnarchive?: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
}) {
  if (events.length === 0) {
    return <p className="text-xs text-ink-muted">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {events.map((e) => (
        <EventRow
          key={e.id}
          event={e}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

export type StandaloneEventsSectionProps = {
  activeEvents: ScheduleEvent[];
  archivedEvents: ScheduleEvent[];
  archivedOpen: boolean;
  onArchivedOpenChange: (open: boolean) => void;
  onEdit: (event: ScheduleEvent) => void;
  onArchive: (event: ScheduleEvent) => void;
  onUnarchive: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
};

export function StandaloneEventsSection({
  activeEvents,
  archivedEvents,
  archivedOpen,
  onArchivedOpenChange,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: StandaloneEventsSectionProps) {
  const [activeSearch, setActiveSearch] = useState("");
  const [archivedSearch, setArchivedSearch] = useState("");

  const sortedActive = useMemo(
    () => eventsByStartDesc(activeEvents),
    [activeEvents],
  );
  const sortedArchived = useMemo(
    () => eventsByStartDesc(archivedEvents),
    [archivedEvents],
  );

  const filteredActive = useMemo(
    () => filterEventsBySearch(sortedActive, activeSearch),
    [sortedActive, activeSearch],
  );
  const filteredArchived = useMemo(
    () => filterEventsBySearch(sortedArchived, archivedSearch),
    [sortedArchived, archivedSearch],
  );

  return (
    <section className="mt-8 space-y-4">
      <div className="space-y-2">
        <h3 className="font-serif text-lg">Active events</h3>
        <EventsSearchInput
          value={activeSearch}
          onChange={setActiveSearch}
          placeholder="Search active events…"
          aria-label="Search active events"
        />
        <EventList
          events={filteredActive}
          emptyMessage={
            activeEvents.length === 0
              ? "No active events yet. Click New event to add one."
              : "No matches."
          }
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>

      <details
        className="group border-t border-paper-line pt-4"
        open={archivedOpen}
        onToggle={(e) => onArchivedOpenChange(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-ink-muted [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block text-base transition-transform group-open:rotate-90"
            >
              ›
            </span>
            Archived events
          </span>
          <span className="text-xs font-normal">{archivedEvents.length}</span>
        </summary>
        <div className="mt-3 space-y-2">
          <EventsSearchInput
            value={archivedSearch}
            onChange={setArchivedSearch}
            placeholder="Search archived events…"
            aria-label="Search archived events"
          />
          <EventList
            events={filteredArchived}
            emptyMessage={
              archivedEvents.length === 0
                ? "No archived events."
                : "No matches."
            }
            onEdit={onEdit}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
          />
        </div>
      </details>
    </section>
  );
}
