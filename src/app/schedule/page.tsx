"use client";

import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";

export default function SchedulePage() {
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Schedule</h2>
      <p className="text-sm text-ink-muted mb-4">
        Tasks by due/delivery dates, grouped by tag within each day. Events
        listed separately.
      </p>

      <ScheduleCalendar />
    </div>
  );
}
