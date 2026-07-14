import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import type { DashboardStats } from "../types";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await apiClient.get<DashboardStats>("/dashboard")).data,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
        <Link to="/tickets/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          + Nouveau ticket
        </Link>
      </div>

      {isLoading || !data ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Tickets au total" value={data.total} />
            <StatCard label="Ouverts" value={data.byStatus.OPEN} />
            <StatCard label="En cours" value={data.byStatus.IN_PROGRESS} />
            <StatCard label="En retard (SLA)" value={data.overdueCount} accent="text-red-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Par statut</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between text-slate-600">
                    <span>{status}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Par priorité</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(data.byPriority).map(([name, count]) => (
                  <li key={name} className="flex justify-between text-slate-600">
                    <span>{name}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </li>
                ))}
                {Object.keys(data.byPriority).length === 0 && <li className="text-slate-400">Aucune donnée</li>}
              </ul>
            </div>
          </div>

          {data.avgResolutionHours !== null && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Temps moyen de résolution :{" "}
              <span className="font-medium text-slate-900">{data.avgResolutionHours.toFixed(1)} heures</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
