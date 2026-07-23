import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { apiClient } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { IconTicket, IconDashboard as IconOpen, IconClock, IconAlertTriangle, IconDownload } from "../components/icons";
import type { ComponentType, SVGProps } from "react";
import type { DashboardAgentStat, DashboardCompanyStat, DashboardStats, DashboardUserStat, TicketStatus } from "../types";
import { STATUS_BAR_COLORS, STATUS_LABELS } from "../constants/ticketStatus";
import { exportDashboardPdf } from "../utils/dashboardPdf";
import { formatDuration } from "../utils/duration";
import { useToast } from "../context/ToastContext";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${accent ?? "text-slate-400"}`} />
      </div>
      <div className={`text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</div>
    </Card>
  );
}

function pct(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "—";
}

function StatsTable({
  title,
  rows,
  nameHeader,
  showAvgResolution,
  billing,
  totalTickets,
}: {
  title: string;
  rows: (DashboardCompanyStat | DashboardAgentStat | DashboardUserStat)[];
  nameHeader: string;
  showAvgResolution?: boolean;
  billing?: boolean;
  totalTickets: number;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {billing && <span className="text-xs text-slate-400">Temps total = base de facturation</span>}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2">{nameHeader}</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">% du total</th>
                <th className="px-3 py-2 text-right">Ouverts</th>
                <th className="px-3 py-2 text-right">Résolus</th>
                <th className="px-3 py-2 text-right">En retard</th>
                {showAvgResolution && <th className="px-3 py-2 text-right">Résolution moy.</th>}
                <th className={`px-5 py-2 text-right ${billing ? "text-brand-600" : ""}`}>Temps total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2 font-medium text-slate-800">{row.name}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.total}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{pct(row.total, totalTickets)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.open}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{row.resolved}</td>
                  <td className={`px-3 py-2 text-right ${row.overdue > 0 ? "font-medium text-red-600" : "text-slate-400"}`}>
                    {row.overdue}
                  </td>
                  {showAvgResolution && (
                    <td className="px-3 py-2 text-right text-slate-500">
                      {"avgResolutionHours" in row && row.avgResolutionHours !== null
                        ? formatDuration(row.avgResolutionHours)
                        : "—"}
                    </td>
                  )}
                  <td className={`px-5 py-2 text-right font-medium ${billing ? "text-brand-700" : "text-slate-700"}`}>
                    {formatDuration(row.totalElapsedHours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function BarRow({
  label,
  value,
  max,
  total,
  color,
}: {
  label: string;
  value: number;
  max: number;
  total: number;
  color: string;
}) {
  const barPct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">
          {value} <span className="text-slate-400">({pct(value, total)})</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await apiClient.get<DashboardStats>("/dashboard")).data,
  });

  const maxStatus = data ? Math.max(1, ...Object.values(data.byStatus)) : 1;
  const maxPriority = data ? Math.max(1, ...Object.values(data.byPriority)) : 1;
  const priorityColors = ["bg-brand-500", "bg-amber-500", "bg-orange-500", "bg-red-500", "bg-slate-400"];

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportDashboardPdf(data);
    } catch {
      toast.error("Échec de la génération du PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
        <div className="flex items-center gap-2">
          {data && (
            <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
              <IconDownload className="mr-1.5 h-4 w-4" />
              {isExporting ? "Génération…" : "Exporter en PDF"}
            </Button>
          )}
          <Link to="/tickets/new">
            <Button>+ Nouveau ticket</Button>
          </Link>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="mb-3 h-4 w-20" />
              <Skeleton className="h-7 w-12" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={IconTicket} label="Tickets au total" value={data.total} />
            <StatCard icon={IconOpen} label="Ouverts" value={data.byStatus.OPEN} />
            <StatCard icon={IconClock} label="En cours" value={data.byStatus.IN_PROGRESS} />
            <StatCard icon={IconAlertTriangle} label="En retard (SLA)" value={data.overdueCount} accent="text-red-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Par statut</h2>
              <div className="space-y-3">
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <BarRow
                    key={status}
                    label={STATUS_LABELS[status as TicketStatus] ?? status}
                    value={count}
                    max={maxStatus}
                    total={data.total}
                    color={STATUS_BAR_COLORS[status as TicketStatus] ?? "bg-slate-400"}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Par priorité</h2>
              {Object.keys(data.byPriority).length === 0 ? (
                <p className="text-sm text-slate-400">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.byPriority).map(([name, count], i) => (
                    <BarRow
                      key={name}
                      label={name}
                      value={count}
                      max={maxPriority}
                      total={data.total}
                      color={priorityColors[i % priorityColors.length]}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {(data.avgResolutionHours !== null || data.totalElapsedHours > 0) && (
            <Card className="mt-4 flex flex-wrap gap-x-8 gap-y-1 p-5 text-sm text-slate-600">
              {data.avgResolutionHours !== null && (
                <span>
                  Temps moyen de résolution :{" "}
                  <span className="font-semibold text-slate-900">{formatDuration(data.avgResolutionHours)}</span>
                </span>
              )}
              <span>
                Temps total écoulé (tous tickets) :{" "}
                <span className="font-semibold text-slate-900">{formatDuration(data.totalElapsedHours)}</span>
              </span>
            </Card>
          )}

          {(data.byCompany.length > 0 || data.byAgent.length > 0 || data.byUser.length > 0) && (
            <div className="mt-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Détails par entité</h2>
              <StatsTable
                title="Par société"
                rows={data.byCompany}
                nameHeader="Société"
                showAvgResolution
                billing
                totalTickets={data.total}
              />
              <StatsTable title="Par agent" rows={data.byAgent} nameHeader="Agent" showAvgResolution totalTickets={data.total} />
              <StatsTable title="Par utilisateur" rows={data.byUser} nameHeader="Utilisateur" totalTickets={data.total} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
