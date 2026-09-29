export function WipMeter({
  active,
  limit,
  label,
}: {
  active: number;
  limit: number;
  label: string;
}) {
  const pct = Math.min(100, Math.round((active / limit) * 100));
  const atLimit = active >= limit;
  return (
    <div className="paper-card p-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium">{label}</span>
        <span className={atLimit ? "text-red-800 font-medium" : "text-ink-muted"}>
          {active} / {limit} active
        </span>
      </div>
      <div className="h-2 rounded-full bg-paper-line overflow-hidden">
        <div
          className={`h-full transition-all ${atLimit ? "bg-red-700" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
