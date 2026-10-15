import { format, addDays } from "date-fns";
import { ApiError, DateOnly, allTasks, handle, readWorkspace } from "@/lib/api/v1";
import { eventIsArchived } from "@/lib/schedule/filter-events";

export const dynamic = "force-dynamic";

type TaskItemBase = {
  date: string;
  title: string;
  id: string;
  direction: string;
  status: string;
  urgency: number;
  backlog: boolean;
};
type AgendaItem =
  | {
      kind: "event";
      date: string;
      start: string;
      end?: string;
      title: string;
      id: string;
      taskId?: string;
      notes?: string;
    }
  | ({ kind: "task_due" } & TaskItemBase)
  | ({ kind: "task_delivery" } & TaskItemBase);

/**
 * GET /api/v1/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD&includeDone=false
 * Defaults: from = today (server local time), to = from + 6 days.
 * Also returns `overdue`: open tasks with dueDate before `from`.
 */
export function GET(request: Request) {
  return handle(async () => {
    const sp = new URL(request.url).searchParams;
    const from = sp.get("from") ?? format(new Date(), "yyyy-MM-dd");
    if (!DateOnly.safeParse(from).success) throw new ApiError(400, "from must be YYYY-MM-DD");
    const to = sp.get("to") ?? format(addDays(new Date(`${from}T00:00:00`), 6), "yyyy-MM-dd");
    if (!DateOnly.safeParse(to).success) throw new ApiError(400, "to must be YYYY-MM-DD");
    const includeDone = sp.get("includeDone") === "true";

    const ws = await readWorkspace();
    const items: AgendaItem[] = [];
    for (const e of ws.scheduleEvents) {
      if (eventIsArchived(e)) continue;
      const d = e.start.slice(0, 10);
      const endD = (e.end ?? e.start).slice(0, 10);
      if (endD < from || d > to) continue;
      items.push({
        kind: "event",
        date: d,
        start: e.start,
        end: e.end,
        title: e.title,
        id: e.id,
        taskId: e.taskId,
        notes: e.notes,
      });
    }
    const tasks = allTasks(ws).filter((t) => includeDone || t.status !== "done");
    for (const t of tasks) {
      const base = {
        title: t.title,
        id: t.id,
        direction: t.direction,
        status: t.status,
        urgency: t.urgency,
        backlog: t.backlog,
      };
      const due = t.dueDate?.slice(0, 10);
      if (due && due >= from && due <= to) items.push({ kind: "task_due", date: due, ...base });
      const del = t.deliveryDate?.slice(0, 10);
      if (del && del >= from && del <= to)
        items.push({ kind: "task_delivery", date: del, ...base });
    }
    items.sort((a, b) => {
      const ka = a.kind === "event" ? a.start : `${a.date}T99`;
      const kb = b.kind === "event" ? b.start : `${b.date}T99`;
      return ka.localeCompare(kb);
    });
    const overdue = allTasks(ws)
      .filter((t) => t.status !== "done" && t.dueDate && t.dueDate.slice(0, 10) < from)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    return { from, to, items, overdue };
  });
}
