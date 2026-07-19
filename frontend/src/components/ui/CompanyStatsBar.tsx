import type { CompanyStat } from "../../utils/companyGrouping";

export function CompanyStatsBar({
  stats,
  unassignedCount,
  unassignedLabel = "Sans société",
  total,
  totalLabel,
}: {
  stats: CompanyStat[];
  unassignedCount?: number;
  unassignedLabel?: string;
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Total</p>
        <p className="mt-1 text-2xl font-bold text-brand-800">{total}</p>
        <p className="truncate text-xs text-brand-600">{totalLabel}</p>
      </div>
      {stats.map((s) => (
        <div key={s.companyId} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500" title={s.companyName}>
            {s.companyName}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{s.count}</p>
        </div>
      ))}
      {Boolean(unassignedCount) && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{unassignedLabel}</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{unassignedCount}</p>
        </div>
      )}
    </div>
  );
}
