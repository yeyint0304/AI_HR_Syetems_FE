export interface HorizontalBarChartDatum {
  label: string;
  value: number;
  valueLabel: string;
}

interface HorizontalBarChartProps {
  title: string;
  bars: HorizontalBarChartDatum[];
  emptyMessage?: string;
}

/**
 * Minimal, dependency-free horizontal bar visualization (CSS width bars) used
 * by the "Hours by Role" (`/reports/roles-summary`) and "Cost vs Revenue"
 * (`/reports/cost-revenue`) panels — the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`) depicts both as a "chart visualization
 * (placeholder)". Per this feature's constraints (no new HTTP/charting
 * library), the actual numbers already rendered in the adjacent data table
 * are the source of truth; these bars are a supplementary, decorative visual
 * summary (`aria-hidden`) — every value is also shown as plain text next to
 * its bar, so no information is conveyed by color/width alone.
 */
export function HorizontalBarChart({ title, bars, emptyMessage }: HorizontalBarChartProps) {
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {bars.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage ?? "No data to display."}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {bars.map((bar) => {
            const widthPercent = Math.max(2, Math.round((bar.value / maxValue) * 100));
            return (
              <li key={bar.label}>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="truncate">{bar.label}</span>
                  <span className="shrink-0 font-medium text-slate-900">{bar.valueLabel}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                  <div
                    aria-hidden="true"
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
