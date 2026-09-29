"use client";

import { isSameMonth } from "date-fns";
import {
  formatDisplayDate,
  formatDisplayDateTime,
} from "@/lib/dates/display";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { getTaskTagId } from "@/lib/tasks/tag-display";
import type { ScheduleEvent } from "@/lib/types/schemas";
import {
  formatPeriodLabel,
  getMonthStartForAnchor,
  getVisibleDays,
  shiftAnchorDate,
  WEEKDAY_LABELS,
  type ScheduleViewMode,
} from "@/lib/schedule/calendar-days";
import { ScheduleEventForm } from "@/components/ScheduleEventForm";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/Modal";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import {
  ScheduleDayCell,
  type ScheduleDayItem,
} from "@/components/schedule/ScheduleDayCell";
import { ScheduleEventNotes } from "@/components/schedule/ScheduleEventNotes";

function defaultNewEvent(): ScheduleEvent {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T09:00`;
  return {
    id: uuidv4(),
    title: "",
    start,
  };
}

export default function SchedulePage() {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const upsertScheduleEvent = useWorkspaceStore((s) => s.upsertScheduleEvent);
  const deleteScheduleEvent = useWorkspaceStore((s) => s.deleteScheduleEvent);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("weekly");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ScheduleEvent | null>(
    null,
  );

  const modalOpen = editing !== null;
  const isNewEvent =
    editing !== null &&
    !(snapshot?.scheduleEvents.some((e) => e.id === editing.id) ?? false);

  const visibleDays = useMemo(
    () => getVisibleDays(viewMode, anchorDate),
    [viewMode, anchorDate],
  );

  const monthStart = useMemo(
    () => getMonthStartForAnchor(anchorDate),
    [anchorDate],
  );

  const periodLabel = useMemo(
    () => formatPeriodLabel(viewMode, anchorDate),
    [viewMode, anchorDate],
  );

  const itemsByDay = useMemo(() => {
    if (!snapshot) return new Map<string, ScheduleDayItem[]>();
    const map = new Map<string, ScheduleDayItem[]>();
    for (const d of visibleDays) {
      map.set(formatDisplayDate(d), []);
    }
    const push = (dateStr: string, item: ScheduleDayItem) => {
      const key = dateStr.slice(0, 10);
      if (!map.has(key)) return;
      map.get(key)!.push(item);
    };
    for (const t of [...snapshot.inboundTasks, ...snapshot.outboundTasks]) {
      const tagId = getTaskTagId(t.tags);
      if (t.dueDate)
        push(t.dueDate, {
          kind: "task",
          title: t.title,
          sub: `${t.direction} · due`,
          tagId,
        });
      if (t.deliveryDate)
        push(t.deliveryDate, {
          kind: "task",
          title: t.title,
          sub: `${t.direction} · delivery`,
          tagId,
        });
    }
    for (const e of snapshot.scheduleEvents) {
      push(e.start, {
        kind: "event",
        title: e.title,
        sub: "event",
        eventId: e.id,
      });
    }
    return map;
  }, [snapshot, visibleDays]);

  const eventById = useMemo(() => {
    const m = new Map<string, ScheduleEvent>();
    for (const e of snapshot?.scheduleEvents ?? []) m.set(e.id, e);
    return m;
  }, [snapshot?.scheduleEvents]);

  const handleEventClick = useCallback(
    (eventId: string) => {
      const ev = eventById.get(eventId);
      if (ev) setEditing(ev);
    },
    [eventById],
  );

  const monthAgendaDays = useMemo(
    () =>
      viewMode === "monthly"
        ? visibleDays.filter((d) => isSameMonth(d, monthStart))
        : [],
    [viewMode, visibleDays, monthStart],
  );

  if (!snapshot) return null;

  const closeModal = () => setEditing(null);

  const weekRows =
    viewMode === "monthly"
      ? Array.from({ length: visibleDays.length / 7 }, (_, row) =>
          visibleDays.slice(row * 7, row * 7 + 7),
        )
      : null;

  return (
    <>
      <ConfirmDeleteModal
        open={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) void deleteScheduleEvent(eventToDelete.id);
        }}
        title="Delete event?"
        description="This calendar event will be removed permanently."
        itemLabel={eventToDelete?.title || "Untitled event"}
      />
      <Modal open={modalOpen} onClose={closeModal} labelledBy="schedule-form-title">
        {editing && (
          <ScheduleEventForm
            key={editing.id}
            event={editing}
            isNew={isNewEvent}
            onSave={async (event) => {
              await upsertScheduleEvent(event);
              closeModal();
            }}
            onCancel={closeModal}
            onDelete={
              !isNewEvent
                ? () => {
                    void deleteScheduleEvent(editing.id);
                    closeModal();
                  }
                : undefined
            }
          />
        )}
      </Modal>

      <div>
        <h2 className="font-serif text-2xl mb-2">Schedule</h2>
        <p className="text-sm text-ink-muted mb-4">
          Tasks by due/delivery dates, grouped by tag within each day. Events
          listed separately.
        </p>

        <ScheduleToolbar
          viewMode={viewMode}
          periodLabel={periodLabel}
          onViewModeChange={setViewMode}
          onPrevious={() =>
            setAnchorDate((d) => shiftAnchorDate(viewMode, d, -1))
          }
          onNext={() => setAnchorDate((d) => shiftAnchorDate(viewMode, d, 1))}
          onToday={() => setAnchorDate(new Date())}
        />

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className="text-sm rounded bg-accent text-white px-3 py-2"
            onClick={() => setEditing(defaultNewEvent())}
          >
            New event
          </button>
        </div>

        {viewMode === "weekly" ? (
          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-7 gap-2">
              {WEEKDAY_LABELS.map((label) => (
                <p
                  key={label}
                  className="text-xs font-medium text-ink-muted text-center py-1"
                >
                  {label}
                </p>
              ))}
            </div>
            <div className="grid md:grid-cols-7 gap-2">
              {visibleDays.map((d) => {
                const key = formatDisplayDate(d);
                return (
                  <ScheduleDayCell
                    key={key}
                    date={d}
                    items={itemsByDay.get(key) ?? []}
                    taskTags={snapshot.taskTags}
                    onEventClick={handleEventClick}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-2">
              {monthAgendaDays.map((d) => {
                const key = formatDisplayDate(d);
                return (
                  <ScheduleDayCell
                    key={key}
                    date={d}
                    items={itemsByDay.get(key) ?? []}
                    taskTags={snapshot.taskTags}
                    onEventClick={handleEventClick}
                  />
                );
              })}
            </div>
            <div className="hidden md:block space-y-2">
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <p
                    key={label}
                    className="text-xs font-medium text-ink-muted text-center py-1"
                  >
                    {label}
                  </p>
                ))}
              </div>
              {weekRows?.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-2">
                  {row.map((d) => {
                    const key = formatDisplayDate(d);
                    const inMonth = isSameMonth(d, monthStart);
                    return (
                      <ScheduleDayCell
                        key={key}
                        date={d}
                        items={itemsByDay.get(key) ?? []}
                        taskTags={snapshot.taskTags}
                        muted={!inMonth}
                        compact
                        onEventClick={handleEventClick}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        <section className="mt-8">
          <h3 className="font-serif text-lg mb-2">Standalone events</h3>
          {snapshot.scheduleEvents.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No events yet. Click <strong>New event</strong> to add one.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {snapshot.scheduleEvents.map((e) => (
                <li
                  key={e.id}
                  className="paper-card px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDisplayDateTime(e.start)}
                      {e.end ? ` → ${formatDisplayDateTime(e.end)}` : ""}
                    </p>
                    {e.notes && (
                      <div className="mt-1 text-xs">
                        <ScheduleEventNotes content={e.notes} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      className="text-xs font-medium rounded px-2.5 py-1 bg-accent text-white"
                      onClick={() => setEditing(e)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-800 underline"
                      onClick={() => setEventToDelete(e)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
