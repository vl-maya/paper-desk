import type { ScheduleViewMode } from "@/lib/schedule/calendar-days";

type ScheduleToolbarProps = {
  viewMode: ScheduleViewMode;
  periodLabel: string;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  hideViewModeToggle?: boolean;
};

function viewModeButtonClass(active: boolean): string {
  return active
    ? "text-sm rounded bg-accent text-white px-3 py-2"
    : "text-sm rounded border border-paper-line bg-card px-3 py-2 text-ink-muted hover:text-ink";
}

export function ScheduleToolbar({
  viewMode,
  periodLabel,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  hideViewModeToggle = false,
}: ScheduleToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-6">
      {!hideViewModeToggle && (
        <div className="flex gap-1" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={viewModeButtonClass(viewMode === "weekly")}
            aria-pressed={viewMode === "weekly"}
            onClick={() => onViewModeChange("weekly")}
          >
            Week
          </button>
          <button
            type="button"
            className={viewModeButtonClass(viewMode === "monthly")}
            aria-pressed={viewMode === "monthly"}
            onClick={() => onViewModeChange("monthly")}
          >
            Month
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          className="text-sm rounded border border-paper-line bg-card px-3 py-2 hover:text-ink text-ink-muted"
          onClick={onPrevious}
          aria-label={viewMode === "weekly" ? "Previous week" : "Previous month"}
        >
          Previous
        </button>
        <p
          className="text-sm font-medium min-w-0 flex-1 text-center sm:min-w-[10rem] sm:flex-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {periodLabel}
        </p>
        <button
          type="button"
          className="text-sm rounded border border-paper-line bg-card px-3 py-2 hover:text-ink text-ink-muted"
          onClick={onNext}
          aria-label={viewMode === "weekly" ? "Next week" : "Next month"}
        >
          Next
        </button>
        <button
          type="button"
          className="text-sm rounded border border-paper-line bg-card px-3 py-2 hover:text-ink text-ink-muted"
          onClick={onToday}
        >
          Today
        </button>
      </div>
    </div>
  );
}
