// Bars are plain { label, value } rows (see Bar in lib/data/stats).

/**
 * Horizontal single-series bars: one hue, labels and values in text ink, a
 * native tooltip per row. Every value is printed, so the list doubles as its
 * own table view.
 */
export function BarList({
  title,
  bars,
  total,
  empty = "Brak danych.",
}: {
  title: string;
  bars: { label: string; value: number }[];
  /** Denominator for the percentage hint; defaults to the largest value. */
  total?: number;
  empty?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const hasData = bars.some((b) => b.value > 0);
  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {!hasData ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {bars.map((b) => {
            const pct = total ? Math.round((b.value / total) * 100) : null;
            return (
              <li
                key={b.label}
                title={`${b.label}: ${b.value}${pct !== null ? ` (${pct}%)` : ""}`}
                className="group hover:bg-muted/60 grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-0.5"
              >
                <span className="truncate text-sm">{b.label}</span>
                <span className="relative h-3">
                  {b.value > 0 && (
                    <span
                      className="bg-chart-bar absolute inset-y-0 left-0 rounded-r-[4px] group-hover:opacity-85"
                      style={{ width: `max(${(b.value / max) * 100}%, 4px)` }}
                    />
                  )}
                </span>
                <span className="text-muted-foreground min-w-14 text-right text-sm tabular-nums">
                  <span className="text-foreground font-medium">{b.value}</span>
                  {pct !== null && <span className="ml-1 text-xs">{pct}%</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-card rounded-xl border px-5 py-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div>}
    </div>
  );
}
