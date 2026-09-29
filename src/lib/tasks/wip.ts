import type { Settings, Task, TaskStatus } from "@/lib/types/schemas";

export function isActiveTask(task: Task, settings: Settings): boolean {
  if (task.backlog || task.status === "done") return false;
  return settings.wipActiveStatuses.includes(task.status as TaskStatus);
}

export function countActiveTasks(tasks: Task[], settings: Settings): number {
  return tasks.filter((t) => isActiveTask(t, settings)).length;
}

export function shouldForceBacklog(
  tasks: Task[],
  settings: Settings,
  excludingTaskId?: string,
): boolean {
  const active = tasks.filter(
    (t) => isActiveTask(t, settings) && t.id !== excludingTaskId,
  );
  return active.length >= settings.wipLimit;
}

export function applyDelayedStatus(task: Task): Task {
  if (task.status === "done") return task;
  if (!task.deliveryDate) return task;
  const delivery = new Date(task.deliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (delivery < today && task.status !== "delayed") {
    return { ...task, status: "delayed", updatedAt: new Date().toISOString() };
  }
  return task;
}

export function applyDelayedToAll(tasks: Task[]): Task[] {
  return tasks.map(applyDelayedStatus);
}
