"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SortPreset, Task, TaskDirection } from "@/lib/types/schemas";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { groupTasks, type TaskGroupBy } from "@/lib/tasks/group";
import { partitionTasks } from "@/lib/tasks/sort";
import { TaskCard } from "./TaskCard";
import { TaskTagPill } from "./TaskTagPill";
import { TaskForm } from "./TaskForm";
import { LinkOutboundPicker } from "./LinkOutboundPicker";
import { Modal } from "./Modal";

export type TaskBoardView = "active" | "backlog" | "delivered";

const UNASSIGNED_ASSIGNEE_FILTER = "__unassigned__";

export function TaskBoard({
  direction,
  view = "active",
}: {
  direction: TaskDirection | "all";
  view?: TaskBoardView;
}) {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const createTask = useWorkspaceStore((s) => s.createTask);
  const upsertTask = useWorkspaceStore((s) => s.upsertTask);
  const setTaskStatus = useWorkspaceStore((s) => s.setTaskStatus);
  const promoteFromBacklog = useWorkspaceStore((s) => s.promoteFromBacklog);
  const demoteToBacklog = useWorkspaceStore((s) => s.demoteToBacklog);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);

  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createDirection, setCreateDirection] =
    useState<TaskDirection>("outbound");
  const [sort, setSort] = useState<SortPreset>("urgency_desc");
  const [groupBy, setGroupBy] = useState<TaskGroupBy>(
    view === "delivered" ? "none" : "status",
  );
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const formOpen = showForm || editTask !== null;

  const closeForm = () => {
    setShowForm(false);
    setEditTask(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (formOpen) return;
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (
        (view === "active" || view === "backlog") &&
        e.key === "n" &&
        !(e.target instanceof HTMLInputElement)
      ) {
        setShowForm(true);
        setEditTask(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, view]);

  const tasks = useMemo(() => {
    if (!snapshot) return [];
    const list =
      direction === "all"
        ? [...snapshot.outboundTasks, ...snapshot.inboundTasks]
        : direction === "inbound"
          ? snapshot.inboundTasks
          : snapshot.outboundTasks;
    let filtered = list;
    if (assigneeFilter === UNASSIGNED_ASSIGNEE_FILTER) {
      filtered = filtered.filter((t) => !t.assigneeId);
    } else if (assigneeFilter) {
      filtered = filtered.filter((t) => t.assigneeId === assigneeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [snapshot, direction, search, assigneeFilter]);

  const items = useMemo(() => {
    const { active, backlog, done } = partitionTasks(tasks);
    if (view === "backlog") return backlog;
    if (view === "delivered") return done;
    return active;
  }, [tasks, view]);

  const groups = useMemo(
    () => groupTasks(items, groupBy, sort, snapshot?.taskTags ?? []),
    [items, groupBy, sort, snapshot?.taskTags],
  );

  if (!snapshot) return null;

  const assigneeMap = new Map(snapshot.assignees.map((a) => [a.id, a]));

  const emptyMessage =
    view === "active"
      ? "Nothing in your active queue. Add a task or promote from backlog."
      : view === "backlog"
        ? "No backlog items. Add a task to queue work here."
        : "No delivered tasks yet.";

  const renderTaskCards = (list: Task[]) =>
    list.map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        taskTags={snapshot.taskTags}
        hideTag={groupBy === "tag"}
        showDirection={direction === "all"}
        assignee={
          task.assigneeId ? assigneeMap.get(task.assigneeId) : undefined
        }
        onStatusChange={
          view !== "delivered"
            ? (status) => void setTaskStatus(task.direction, task.id, status)
            : undefined
        }
        onPromote={
          view === "backlog"
            ? () => void promoteFromBacklog(task.direction, task.id)
            : undefined
        }
        onDemote={
          view === "active"
            ? () => void demoteToBacklog(task.direction, task.id)
            : undefined
        }
        onEdit={() => {
          setShowForm(false);
          setEditTask(task);
        }}
        onDelete={() => {
          void deleteTask(task.direction, task.id);
          if (editTask?.id === task.id) closeForm();
        }}
        assignees={snapshot.assignees}
        onAssigneeChange={(assigneeId) =>
          void upsertTask({ ...task, assigneeId })
        }
        extra={
          task.direction === "inbound" && view !== "delivered" ? (
            <LinkOutboundPicker inboundTaskId={task.id} />
          ) : undefined
        }
      />
    ));

  const columnLayout = groupBy !== "none";

  return (
    <div className={columnLayout ? "min-w-0 w-full" : "max-w-2xl"}>
      <Modal open={formOpen} onClose={closeForm} labelledBy="task-form-title">
        <TaskForm
          key={editTask?.id ?? "new-task"}
          direction={
            editTask?.direction ??
            (direction === "all" ? createDirection : direction)
          }
          showDirectionSelect={!editTask && direction === "all"}
          onDirectionChange={setCreateDirection}
          assignees={snapshot.assignees}
          taskTags={snapshot.taskTags}
          initial={editTask ?? undefined}
          onCancel={closeForm}
          onSubmit={async (data) => {
            if (editTask) {
              await upsertTask({
                ...editTask,
                ...data,
              });
            } else {
              const taskDirection =
                direction === "all" ? createDirection : direction;
              await createTask(taskDirection, {
                ...data,
                ...(view === "backlog" ? { backlog: true } : {}),
              });
            }
            closeForm();
          }}
        />
      </Modal>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {(view === "active" || view === "backlog") && (
          <button
            type="button"
            className="rounded bg-accent px-3 py-2 text-sm text-white"
            onClick={() => {
              setEditTask(null);
              setCreateDirection("outbound");
              setShowForm(true);
            }}
          >
            New task
          </button>
        )}
        <label className="text-sm text-ink-muted flex items-center gap-1.5">
          Group
          <select
            className="border border-paper-line rounded px-2 py-1.5 text-sm bg-card text-ink"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as TaskGroupBy)}
          >
            <option value="none">None</option>
            <option value="status">Status</option>
            <option value="urgency">Urgency</option>
            <option value="due_date">Due date</option>
            <option value="delivery_date">Delivery date</option>
            <option value="tag">Task type</option>
          </select>
        </label>
        <label className="text-sm text-ink-muted flex items-center gap-1.5">
          Sort
          <select
            className="border border-paper-line rounded px-2 py-1.5 text-sm bg-card text-ink"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortPreset)}
          >
            <option value="urgency_desc">Urgency</option>
            <option value="due_asc">Due date</option>
            <option value="delivery_asc">Delivery date</option>
            <option value="created_desc">Created</option>
          </select>
        </label>
        <label className="text-sm text-ink-muted flex items-center gap-1.5">
          Assignee
          <select
            className="border border-paper-line rounded px-2 py-1.5 text-sm bg-card text-ink max-w-[10rem]"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value={UNASSIGNED_ASSIGNEE_FILTER}>Unassigned</option>
            {snapshot.assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search… (press /)"
          className="border border-paper-line rounded px-2 py-1.5 text-sm bg-card w-full min-w-[140px] sm:w-auto sm:flex-1 sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section>
        {direction !== "all" && view === "active" && (
          <h3 className="font-serif text-sm mb-3 text-ink-muted">
            Active ({items.length})
          </h3>
        )}
        {direction !== "all" && view === "backlog" && (
          <h3 className="font-serif text-sm mb-3 text-ink-muted">
            Backlog ({items.length})
          </h3>
        )}
        {direction !== "all" && view === "delivered" && (
          <h3 className="font-serif text-sm mb-3 text-ink-muted">
            Delivered ({items.length})
          </h3>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-ink-muted">{emptyMessage}</p>
        ) : columnLayout ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 items-start">
            {groups.map((group) => (
              <div
                key={group.key}
                className="flex w-72 shrink-0 flex-col rounded-md border border-paper-line bg-card/50 max-h-[calc(100dvh-14rem)]"
              >
                <h4 className="font-serif text-sm text-ink px-3 py-2.5 border-b border-paper-line bg-card/90 shrink-0 flex flex-wrap items-center gap-2">
                  {group.tag ? (
                    <TaskTagPill tag={group.tag} />
                  ) : (
                    group.label
                  )}
                  <span className="text-xs font-normal text-ink-muted">
                    ({group.tasks.length})
                  </span>
                </h4>
                <div className="space-y-2 overflow-y-auto p-2 min-h-[4rem]">
                  {renderTaskCards(group.tasks)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{renderTaskCards(items)}</div>
        )}
      </section>
    </div>
  );
}
