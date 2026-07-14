import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Company, CompanyType } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const TYPE_LABELS: Record<CompanyType, string> = {
  HOLDING: "Holding",
  FILIALE: "Filiale",
};

export function AdminCompanies() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("FILIALE");
  const [error, setError] = useState<string | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/companies", { name, type }),
    onSuccess: () => {
      setName("");
      toast.success("Société créée");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer la société");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (company: Company) => apiClient.patch(`/companies/${company.id}`, { isActive: !company.isActive }),
    onSuccess: (_res, company) => {
      toast.success(company.isActive ? "Société désactivée" : "Société activée");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Sociétés du groupe</h1>

      <Card className="mb-6 p-5">
        <form onSubmit={handleSubmit} className="flex gap-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex : Meninx Agro)"
            className={`flex-1 ${inputClass}`}
          />
          <select value={type} onChange={(e) => setType(e.target.value as CompanyType)} className={inputClass}>
            <option value="FILIALE">Filiale</option>
            <option value="HOLDING">Holding</option>
          </select>
          <Button type="submit" loading={createMutation.isPending}>
            Ajouter
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}
            {companies?.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.type === "HOLDING" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {TYPE_LABELS[c.type]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      c.isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {c.isActive ? "Active" : "Désactivée"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggleMutation.mutate(c)}
                    className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                  >
                    {c.isActive ? "Désactiver" : "Activer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
