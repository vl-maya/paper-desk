export type UrgencyTone = {
  label: string;
  bar: string;
  text: string;
  pill: string;
};

const URGENCY_BY_LEVEL: Record<number, UrgencyTone> = {
  1: {
    label: "Low",
    bar: "bg-stone-300",
    text: "text-stone-600",
    pill: "bg-stone-100 text-stone-700",
  },
  2: {
    label: "Moderate",
    bar: "bg-stone-400",
    text: "text-stone-700",
    pill: "bg-stone-100 text-stone-800",
  },
  3: {
    label: "Normal",
    bar: "bg-amber-400",
    text: "text-amber-900",
    pill: "bg-amber-50 text-amber-900",
  },
  4: {
    label: "High",
    bar: "bg-orange-500",
    text: "text-orange-900",
    pill: "bg-orange-100 text-orange-900",
  },
  5: {
    label: "Critical",
    bar: "bg-red-600",
    text: "text-red-900",
    pill: "bg-red-100 text-red-900",
  },
};

export function getUrgencyDisplay(urgency: number): UrgencyTone {
  const level = Math.min(5, Math.max(1, Math.round(urgency)));
  return URGENCY_BY_LEVEL[level];
}
