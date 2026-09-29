"use client";

import { useState } from "react";
import type {
  Assignee,
  Task,
  TaskDirection,
  TaskStatus,
  TaskTag,
} from "@/lib/types/schemas";
import { normalizeTaskDateField } from "@/lib/dates/display";
import { getTaskTagId } from "@/lib/tasks/tag-display";
import { formatTaskDate } from "@/lib/tasks/dates";
import { AssigneeSelect } from "./AssigneeSelect";
import { TaskTagSelect } from "./TaskTagSelect";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_SELECT_ORDER,
} from "@/lib/tasks/status-display";

export function TaskForm({
  direction,
  assignees,
  taskTags,
  initial,
  onSubmit,
  onCancel,
  showDirectionSelect,
  onDirectionChange,
}: {
  direction: TaskDirection;
  assignees: Assignee[];
  taskTags: TaskTag[];
  initial?: Task;
  showDirectionSelect?: boolean;
  onDirectionChange?: (direction: TaskDirection) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    urgency: number;
    dueDate?: string;
    deliveryDate?: string;
    assigneeId?: string;
    backlog?: boolean;
    tags?: string[];
  }) => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [urgency, setUrgency] = useState(initial?.urgency ?? 3);
  const [dueDate, setDueDate] = useState(() =>
    initial?.dueDate ? formatTaskDate(initial.dueDate) : "",
  );
  const [deliveryDate, setDeliveryDate] = useState(() =>
    initial?.deliveryDate ? formatTaskDate(initial.deliveryDate) : "",
  );
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId);
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [backlog, setBacklog] = useState(initial?.backlog ?? false);
  const [tagId, setTagId] = useState<string | undefined>(() =>
    getTaskTagId(initial?.tags),
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          description: description.trim() || undefined,
          urgency,
          dueDate: normalizeTaskDateField(dueDate),
          deliveryDate: normalizeTaskDateField(deliveryDate),
          assigneeId,
          tags: tagId ? [tagId] : undefined,
          ...(isEdit ? { status, backlog: status === "done" ? false : backlog } : {}),
        });
      }}
    >
      <h3 id="task-form-title" className="font-serif text-lg pr-8">
        {isEdit ? "Edit" : "New"} {direction} task
      </h3>
      {showDirectionSelect && onDirectionChange && !isEdit && (
        <label className="block text-sm">
          Queue
          <select
            className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
            value={direction}
            onChange={(e) =>
              onDirectionChange(e.target.value as TaskDirection)
            }
          >
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </label>
      )}
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
        Tag
        <span className="block text-xs text-ink-muted font-normal mt-0.5">
          Optional — manage labels and colors in Settings.
        </span>
        <div className="mt-1">
          <TaskTagSelect
            tags={taskTags}
            value={tagId}
            onChange={setTagId}
          />
        </div>
      </label>
      <label className="block text-sm">
        Description
        <span className="block text-xs text-ink-muted font-normal mt-0.5">
          Markdown supported (lists, headings, **bold**).
        </span>
        <textarea
          className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card min-h-[80px] font-mono text-[13px] leading-relaxed"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {isEdit && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            Status
            <select
              className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUS_SELECT_ORDER.map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={backlog}
              disabled={status === "done"}
              onChange={(e) => setBacklog(e.target.checked)}
            />
            In backlog
          </label>
        </div>
      )}
      <label className="block text-sm">
        Urgency (1–5)
        <input
          type="number"
          min={1}
          max={5}
          className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
          value={urgency}
          onChange={(e) => setUrgency(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key >= "1" && e.key <= "5" && !e.metaKey && !e.ctrlKey) {
              setUrgency(Number(e.key));
            }
          }}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Due date
          <input
            type="date"
            className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Delivery date
          <input
            type="date"
            className="mt-1 w-full border border-paper-line rounded px-2 py-1.5 bg-card"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm">
        Assignee
        <div className="mt-1">
          <AssigneeSelect
            assignees={assignees}
            value={assigneeId}
            onChange={setAssigneeId}
          />
        </div>
      </label>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="rounded bg-accent px-4 py-2 text-sm text-white"
        >
          {isEdit ? "Save changes" : "Create"}
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
      </div>
    </form>
  );
}
