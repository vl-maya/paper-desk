import type { SortPreset, Task } from "@/lib/types/schemas";

function dateOrMax(iso?: string): number {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  return new Date(iso).getTime();
}

function dateOrMin(iso?: string): number {
  if (!iso) return 0;
  return new Date(iso).getTime();
}

export function sortTasks(tasks: Task[], preset: SortPreset): Task[] {
  const copy = [...tasks];
  switch (preset) {
    case "urgency_desc":
      copy.sort((a, b) => {
        if (b.urgency !== a.urgency) return b.urgency - a.urgency;
        return dateOrMax(a.dueDate) - dateOrMax(b.dueDate);
      });
      break;
    case "due_asc":
      copy.sort((a, b) => {
        const d = dateOrMax(a.dueDate) - dateOrMax(b.dueDate);
        if (d !== 0) return d;
        return b.urgency - a.urgency;
      });
      break;
    case "delivery_asc":
      copy.sort((a, b) => {
        const d = dateOrMax(a.deliveryDate) - dateOrMax(b.deliveryDate);
        if (d !== 0) return d;
        return b.urgency - a.urgency;
      });
      break;
    case "created_desc":
      copy.sort(
        (a, b) =>
          dateOrMin(b.createdAt) - dateOrMin(a.createdAt) ||
          b.urgency - a.urgency,
      );
      break;
  }
  return copy;
}

export function partitionTasks(tasks: Task[]) {
  const active: Task[] = [];
  const backlog: Task[] = [];
  const done: Task[] = [];
  for (const t of tasks) {
    if (t.status === "done") done.push(t);
    else if (t.backlog) backlog.push(t);
    else active.push(t);
  }
  return { active, backlog, done };
}
