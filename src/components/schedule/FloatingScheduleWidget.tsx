"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";

export function FloatingScheduleWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button (Lower Right) */}
      <aside
        aria-label="Weekly schedule widget"
        className="fixed bottom-6 right-6 z-30 pointer-events-none"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto group flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-white shadow-lg shadow-ink/20 transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label="Open weekly schedule"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <svg
            className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-sm font-medium pr-1">Weekly schedule</span>
        </button>
      </aside>

      {/* Floating Weekly Schedule Modal */}
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy="floating-weekly-schedule-title"
        maxWidthClass="max-w-5xl"
        maxHeightClass="max-h-[88vh]"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8 pb-3 border-b border-paper-line">
            <div>
              <h2
                id="floating-weekly-schedule-title"
                className="font-serif text-xl text-ink"
              >
                Weekly schedule
              </h2>
              <p className="text-xs text-ink-muted">
                Tasks and events scheduled across this week.
              </p>
            </div>
            <Link
              href="/schedule"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
            >
              Open full schedule →
            </Link>
          </div>

          <div className="pt-1">
            <ScheduleCalendar
              fixedMode="weekly"
              showStandaloneEvents={false}
              eventModalPriority="elevated"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
