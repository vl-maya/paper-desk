import { addDays, isBefore, parseISO, startOfDay } from "date-fns";
import type { WorkspaceSnapshot } from "@/lib/types/schemas";
import {
  countActiveTasks,
  isActiveTask,
} from "@/lib/tasks/wip";
import { formatTaskDate } from "@/lib/tasks/dates";

export type QueryTemplateId =
  | "wip"
  | "overdue"
  | "due_week"
  | "blocked_delayed"
  | "high_urgency"
  | "inbound_unlinked"
  | "by_assignee";

export const QUERY_TEMPLATES: {
  id: QueryTemplateId;
  label: string;
  prompt: string;
}[] = [
  { id: "wip", label: "WIP status", prompt: "wip status" },
  { id: "overdue", label: "Overdue tasks", prompt: "overdue tasks" },
  { id: "due_week", label: "Due in 7 days", prompt: "due in next 7 days" },
  {
    id: "blocked_delayed",
    label: "Blocked & delayed",
    prompt: "blocked and delayed",
  },
  {
    id: "high_urgency",
    label: "High urgency (4–5)",
    prompt: "high urgency not done",
  },
  {
    id: "inbound_unlinked",
    label: "Inbound without outbound",
    prompt: "inbound not linked",
  },
  { id: "by_assignee", label: "Summary by assignee", prompt: "summary by assignee" },
];

export type MechanicalResult = {
  matched: boolean;
  templateId?: QueryTemplateId;
  answer: string;
};

function formatTaskLine(
  t: { title: string; status: string; urgency: number; dueDate?: string },
  extra?: string,
) {
  const due = t.dueDate ? ` · due ${formatTaskDate(t.dueDate)}` : "";
  return `- **${t.title}** (${t.status}, urgency ${t.urgency})${due}${extra ?? ""}`;
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return isBefore(parseISO(dueDate), startOfDay(new Date()));
}

function dueWithinDays(dueDate: string | undefined, days: number): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  const end = addDays(startOfDay(new Date()), days);
  return !isBefore(d, startOfDay(new Date())) && !isBefore(end, d);
}

function runTemplate(
  ws: WorkspaceSnapshot,
  id: QueryTemplateId,
): string {
  const allOpen = [...ws.inboundTasks, ...ws.outboundTasks].filter(
    (t) => t.status !== "done",
  );

  switch (id) {
    case "wip": {
      const inA = countActiveTasks(ws.inboundTasks, ws.settings);
      const outA = countActiveTasks(ws.outboundTasks, ws.settings);
      const inB = ws.inboundTasks.filter((t) => t.backlog && t.status !== "done").length;
      const outB = ws.outboundTasks.filter((t) => t.backlog && t.status !== "done").length;
      return [
        `**WIP limit:** ${ws.settings.wipLimit}`,
        `- Inbound active: ${inA} · backlog: ${inB}`,
        `- Outbound active: ${outA} · backlog: ${outB}`,
      ].join("\n");
    }
    case "overdue": {
      const overdue = allOpen.filter((t) => isOverdue(t.dueDate));
      if (!overdue.length) return "No overdue open tasks.";
      return overdue.map((t) => formatTaskLine(t, ` · ${t.direction}`)).join("\n");
    }
    case "due_week": {
      const due = allOpen.filter((t) => dueWithinDays(t.dueDate, 7));
      if (!due.length) return "Nothing due in the next 7 days.";
      return due.map((t) => formatTaskLine(t, ` · ${t.direction}`)).join("\n");
    }
    case "blocked_delayed": {
      const hits = allOpen.filter(
        (t) => t.status === "blocked" || t.status === "delayed",
      );
      if (!hits.length) return "No blocked or delayed tasks.";
      return hits.map((t) => formatTaskLine(t, ` · ${t.direction}`)).join("\n");
    }
    case "high_urgency": {
      const hits = allOpen.filter((t) => t.urgency >= 4);
      if (!hits.length) return "No open tasks with urgency 4–5.";
      return hits.map((t) => formatTaskLine(t, ` · ${t.direction}`)).join("\n");
    }
    case "inbound_unlinked": {
      const linked = new Set(ws.links.map((l) => l.inboundTaskId));
      const unlinked = ws.inboundTasks.filter(
        (t) => t.status !== "done" && !linked.has(t.id),
      );
      if (!unlinked.length) return "All open inbound tasks have outbound links.";
      return unlinked.map((t) => formatTaskLine(t)).join("\n");
    }
    case "by_assignee": {
      const lines: string[] = [];
      for (const a of ws.assignees) {
        const tasks = allOpen.filter((t) => t.assigneeId === a.id);
        lines.push(`**${a.name}:** ${tasks.length} open`);
        for (const t of tasks.slice(0, 5)) {
          lines.push(formatTaskLine(t));
        }
      }
      const unassigned = allOpen.filter((t) => !t.assigneeId);
      if (unassigned.length) {
        lines.push(`**Unassigned:** ${unassigned.length}`);
      }
      return lines.join("\n") || "No assignees configured.";
    }
  }
}

function matchTemplate(input: string): QueryTemplateId | null {
  const q = input.trim().toLowerCase();
  for (const t of QUERY_TEMPLATES) {
    if (q === t.id || q === t.prompt || q.includes(t.prompt)) return t.id;
  }
  if (/\bwip\b/.test(q)) return "wip";
  if (/overdue/.test(q)) return "overdue";
  if (/blocked|delayed/.test(q)) return "blocked_delayed";
  if (/urgent|urgency/.test(q)) return "high_urgency";
  if (/inbound.*link|unlinked/.test(q)) return "inbound_unlinked";
  if (/assignee|by assignee/.test(q)) return "by_assignee";
  if (/due.*7|next 7|week/.test(q)) return "due_week";
  if (/deadline|due/.test(q)) return "due_week";
  return null;
}

export function runMechanicalQuery(
  ws: WorkspaceSnapshot,
  input: string,
  templateId?: QueryTemplateId,
): MechanicalResult {
  const id = templateId ?? matchTemplate(input);
  if (id) {
    return {
      matched: true,
      templateId: id,
      answer: runTemplate(ws, id),
    };
  }
  return {
    matched: false,
    answer:
      "No mechanical match. Try a template chip or enable **Use AI** for free-form questions.",
  };
}

export function buildAiContext(ws: WorkspaceSnapshot): string {
  const open = [...ws.inboundTasks, ...ws.outboundTasks].filter(
    (t) => t.status !== "done",
  );
  const active = open.filter((t) => isActiveTask(t, ws.settings));
  const lines = [
    `WIP limit: ${ws.settings.wipLimit}, active: ${active.length}`,
    `Inbound open: ${ws.inboundTasks.filter((t) => t.status !== "done").length}`,
    `Outbound open: ${ws.outboundTasks.filter((t) => t.status !== "done").length}`,
    "Top tasks:",
  ];
  const sorted = [...open].sort((a, b) => b.urgency - a.urgency).slice(0, 15);
  for (const t of sorted) {
    lines.push(
      `- [${t.direction}] ${t.title} status=${t.status} urgency=${t.urgency} due=${t.dueDate ? formatTaskDate(t.dueDate) : "—"} delivery=${t.deliveryDate ? formatTaskDate(t.deliveryDate) : "—"}`,
    );
  }
  return lines.join("\n");
}
