"use client";

import { addDays, isBefore, parseISO, startOfDay } from "date-fns";
import { formatDisplayDate } from "@/lib/dates/display";
import { useMemo } from "react";
import Link from "next/link";
import { useWorkspaceStore, useWipCounts } from "@/lib/store/workspace-store";
import { WipMeter } from "@/components/WipMeter";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";

export default function DashboardPage() {
  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const inboundWip = useWipCounts("inbound");
  const outboundWip = useWipCounts("outbound");

  const stats = useMemo(() => {
    if (!snapshot) return null;
    const open = [...snapshot.inboundTasks, ...snapshot.outboundTasks].filter(
      (t) => t.status !== "done",
    );
    const today = startOfDay(new Date());
    const overdue = open.filter(
      (t) => t.dueDate && isBefore(parseISO(t.dueDate), today),
    );
    const blocked = open.filter(
      (t) => t.status === "blocked" || t.status === "delayed",
    );
    const weekEnd = addDays(today, 7);
    const dueSoon = open.filter((t) => {
      if (!t.dueDate) return false;
      const d = parseISO(t.dueDate);
      return !isBefore(d, today) && !isBefore(weekEnd, d);
    });
    return { overdue: overdue.length, blocked: blocked.length, dueSoon: dueSoon.length };
  }, [snapshot]);

  const agenda = useMemo(() => {
    if (!snapshot) return [];
    const todayStr = formatDisplayDate(new Date());
    const items: { title: string; kind: string; date: string }[] = [];
    for (const t of [...snapshot.inboundTasks, ...snapshot.outboundTasks]) {
      if (t.dueDate === todayStr)
        items.push({ title: t.title, kind: `${t.direction} due`, date: t.dueDate });
      if (t.deliveryDate === todayStr)
        items.push({
          title: t.title,
          kind: `${t.direction} delivery`,
          date: t.deliveryDate,
        });
    }
    for (const e of snapshot.scheduleEvents) {
      if (e.start.startsWith(todayStr))
        items.push({ title: e.title, kind: "event", date: e.start });
    }
    return items;
  }, [snapshot]);

  if (!snapshot) return null;

  return (
    <div>
      <h2 className="font-serif text-2xl mb-6">Dashboard</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <WipMeter
          label="Inbound WIP"
          active={inboundWip.active}
          limit={inboundWip.limit}
        />
        <WipMeter
          label="Outbound WIP"
          active={outboundWip.active}
          limit={outboundWip.limit}
        />
      </div>
      {stats && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="paper-card p-4">
            <p className="text-xs text-ink-muted">Overdue</p>
            <p className="text-2xl font-serif">{stats.overdue}</p>
          </div>
          <div className="paper-card p-4">
            <p className="text-xs text-ink-muted">Blocked / delayed</p>
            <p className="text-2xl font-serif">{stats.blocked}</p>
          </div>
          <div className="paper-card p-4">
            <p className="text-xs text-ink-muted">Due in 7 days</p>
            <p className="text-2xl font-serif">{stats.dueSoon}</p>
          </div>
        </div>
      )}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-serif text-lg">Weekly schedule</h3>
            <p className="text-xs text-ink-muted">
              Tasks and events scheduled across this week.
            </p>
          </div>
          <Link
            href="/schedule"
            className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
          >
            Open full schedule →
          </Link>
        </div>
        <ScheduleCalendar fixedMode="weekly" showStandaloneEvents={false} />
      </section>

      <section>
        <h3 className="font-serif text-lg mb-3">Today</h3>
        {agenda.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing scheduled for today.</p>
        ) : (
          <ul className="space-y-2">
            {agenda.map((item, i) => (
              <li key={i} className="paper-card px-3 py-2 text-sm">
                <span className="text-ink-muted">{item.kind}</span> — {item.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
