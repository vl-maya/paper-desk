import {
  formatTaskDate,
  getDueDateKind,
  isDeliveryPassed,
} from "@/lib/tasks/dates";
import { getUrgencyDisplay } from "@/lib/tasks/urgency-display";
import type { Task } from "@/lib/types/schemas";

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 min-h-[1.375rem]">
      <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <div className="flex-1 min-w-0 flex justify-end">{children}</div>
    </div>
  );
}

function UrgencyMeter({ urgency }: { urgency: number }) {
  const tone = getUrgencyDisplay(urgency);
  return (
    <div
      className="flex items-center gap-2"
      title={`Urgency ${urgency} — ${tone.label}`}
    >
      <div className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className={`h-2 w-2.5 rounded-sm ${
              level <= urgency ? tone.bar : "bg-stone-200/90"
            }`}
          />
        ))}
      </div>
      <span
        className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone.pill}`}
      >
        {tone.label}
      </span>
    </div>
  );
}

const DUE_STYLES: Record<
  ReturnType<typeof getDueDateKind>,
  { pill: string; prefix: string | null }
> = {
  none: { pill: "text-ink-muted", prefix: null },
  overdue: {
    pill: "bg-red-100 text-red-900 font-semibold",
    prefix: "Overdue",
  },
  today: {
    pill: "bg-red-100 text-red-900 font-semibold",
    prefix: "Due today",
  },
  soon: {
    pill: "bg-amber-100 text-amber-950 font-medium",
    prefix: "Due soon",
  },
  later: {
    pill: "bg-stone-100/80 text-ink-muted",
    prefix: null,
  },
};

function DueDateValue({ dueDate }: { dueDate?: string }) {
  const kind = getDueDateKind(dueDate);
  const style = DUE_STYLES[kind];

  if (!dueDate) {
    return <span className="text-xs text-ink-muted">—</span>;
  }

  const formatted = formatTaskDate(dueDate);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${style.pill}`}>
      {style.prefix && <span>{style.prefix}</span>}
      {style.prefix && (
        <span className="opacity-60" aria-hidden>
          ·
        </span>
      )}
      <time dateTime={formatted}>{formatted}</time>
    </span>
  );
}

function DeliveryDateValue({
  deliveryDate,
  status,
}: {
  deliveryDate?: string;
  status: Task["status"];
}) {
  if (!deliveryDate) {
    return <span className="text-xs text-ink-muted">—</span>;
  }

  const passed = isDeliveryPassed(deliveryDate, status);
  const formatted = formatTaskDate(deliveryDate);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${
        passed
          ? "bg-orange-100 text-orange-950 font-medium"
          : "bg-stone-100/80 text-ink"
      }`}
    >
      {passed && <span>Passed</span>}
      {passed && (
        <span className="opacity-60" aria-hidden>
          ·
        </span>
      )}
      <time dateTime={formatted}>{formatted}</time>
    </span>
  );
}

export function TaskCardSchedule({ task }: { task: Task }) {
  return (
    <div className="mt-2.5 space-y-1 border-t border-paper-line/60 pt-2.5">
      <MetaRow label="Urgency">
        <UrgencyMeter urgency={task.urgency} />
      </MetaRow>
      <MetaRow label="Due">
        <DueDateValue dueDate={task.dueDate} />
      </MetaRow>
      <MetaRow label="Delivery">
        <DeliveryDateValue
          deliveryDate={task.deliveryDate}
          status={task.status}
        />
      </MetaRow>
    </div>
  );
}
