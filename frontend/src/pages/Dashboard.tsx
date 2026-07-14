import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { IconTicket, IconDashboard as IconOpen, IconClock, IconAlertTriangle } from "../components/icons";
import type { ComponentType, SVGProps } from "react";
import type { DashboardStats } from "../types";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  ON_HOLD: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  ON_HOLD: "bg-slate-400",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-slate-300",
};

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

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await apiClient.get<DashboardStats>("/dashboard")).data,
  });

  const maxStatus = data ? Math.max(1, ...Object.values(data.byStatus)) : 1;
  const maxPriority = data ? Math.max(1, ...Object.values(data.byPriority)) : 1;
  const priorityColors = ["bg-brand-500", "bg-amber-500", "bg-orange-500", "bg-red-500", "bg-slate-400"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
        <Link to="/tickets/new">
          <Button>+ Nouveau ticket</Button>
        </Link>
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
                    label={STATUS_LABELS[status] ?? status}
                    value={count}
                    max={maxStatus}
                    color={STATUS_COLORS[status] ?? "bg-slate-400"}
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
                      color={priorityColors[i % priorityColors.length]}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {data.avgResolutionHours !== null && (
            <Card className="mt-4 p-5 text-sm text-slate-600">
              Temps moyen de résolution :{" "}
              <span className="font-semibold text-slate-900">{data.avgResolutionHours.toFixed(1)} heures</span>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
