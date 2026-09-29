"use client";

import { useState } from "react";
import type { Assignee, Task, TaskStatus, TaskTag } from "@/lib/types/schemas";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { getTaskTagId, taskTagFromId } from "@/lib/tasks/tag-display";
import { TaskTagPill } from "./TaskTagPill";
import { AssigneeSelect } from "./AssigneeSelect";
import { StatusBadge } from "./StatusBadge";
import { TaskCardSchedule } from "./TaskCardSchedule";
import { MarkdownBody } from "./MarkdownBody";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_SELECT_ORDER,
} from "@/lib/tasks/status-display";

export function TaskCard({
  task,
  taskTags,
  assignee,
  assignees,
  showDirection,
  hideTag,
  onStatusChange,
  onAssigneeChange,
  onPromote,
  onDemote,
  onEdit,
  onDelete,
  extra,
}: {
  task: Task;
  taskTags?: TaskTag[];
  assignee?: Assignee;
  assignees?: Assignee[];
  showDirection?: boolean;
  hideTag?: boolean;
  onStatusChange?: (status: TaskStatus) => void;
  onAssigneeChange?: (assigneeId: string | undefined) => void;
  onPromote?: () => void;
  onDemote?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const assigneeEditable = Boolean(onAssigneeChange && assignees);
  const tag = taskTagFromId(getTaskTagId(task.tags), taskTags ?? []);
  return (
    <article className="paper-card p-3 text-sm">
      <div className="flex justify-between gap-2 items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-left">{task.title}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            {tag && !hideTag && <TaskTagPill tag={tag} />}
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            className="shrink-0 text-xs font-medium rounded px-2.5 py-1 bg-accent text-white hover:opacity-90"
            onClick={onEdit}
          >
            Edit
          </button>
        )}
      </div>
      {task.description && (
        <div className="mt-2 text-ink-muted">
          <MarkdownBody content={task.description} compact />
        </div>
      )}
      <TaskCardSchedule task={task} />
      {(showDirection || task.backlog || (assignee && !assigneeEditable)) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-muted">
          {showDirection && (
            <span className="rounded bg-paper-line/60 px-1.5 py-0.5 capitalize">
              {task.direction}
            </span>
          )}
          {assignee && !assigneeEditable && <span>{assignee.name}</span>}
          {task.backlog && <span className="text-accent">Backlog</span>}
        </div>
      )}
      {extra}
      <div className="mt-3 flex justify-between gap-2 items-end">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-0">
          {assigneeEditable && (
            <AssigneeSelect
              assignees={assignees!}
              value={task.assigneeId}
              onChange={onAssigneeChange!}
              className="text-xs border border-paper-line rounded px-1 py-0.5 bg-card max-w-[9rem]"
            />
          )}
          {onStatusChange && task.status !== "done" && (
            <select
              className="text-xs border border-paper-line rounded px-1 py-0.5 bg-card"
              value={task.status}
              onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            >
              {TASK_STATUS_SELECT_ORDER.map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          )}
          {task.backlog && onPromote && (
            <button
              type="button"
              className="text-xs text-accent underline"
              onClick={onPromote}
            >
              Promote
            </button>
          )}
          {!task.backlog && task.status !== "done" && onDemote && (
            <button
              type="button"
              className="text-xs text-ink-muted underline"
              onClick={onDemote}
            >
              To backlog
            </button>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            className="shrink-0 text-xs text-red-800 underline"
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
          title="Delete task?"
          description="This task will be permanently removed from your workspace."
          itemLabel={task.title}
        />
      )}
    </article>
  );
}
