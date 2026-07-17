import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Company, CompanyType, Service } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const TYPE_LABELS: Record<CompanyType, string> = {
  HOLDING: "Holding",
  FILIALE: "Filiale",
};

interface TreeRow {
  company: Company;
  depth: number;
}

function buildTree(companies: Company[]): TreeRow[] {
  const byParent = new Map<string | null, Company[]>();
  for (const c of companies) {
    const key = c.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows: TreeRow[] = [];
  const visited = new Set<string>();
  function visit(parentId: string | null, depth: number) {
    for (const c of byParent.get(parentId) ?? []) {
      if (visited.has(c.id)) continue; // garde-fou anti-cycle côté affichage
      visited.add(c.id);
      rows.push({ company: c, depth });
      visit(c.id, depth + 1);
    }
  }
  visit(null, 0);
  return rows;
}

export function AdminCompanies() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("FILIALE");
  const [parentId, setParentId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await apiClient.get<{ services: Service[] }>("/services")).data.services,
  });

  const rows = useMemo(() => buildTree(companies ?? []), [companies]);

  function toggleService(serviceId: string) {
    setServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]));
  }

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/companies", { name, type, parentId: parentId || null, serviceIds }),
    onSuccess: () => {
      setName("");
      setParentId("");
      setServiceIds([]);
      setShowForm(false);
      toast.success("Société créée");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer la société");
      setError(msg);
      toast.error(msg);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-900">Sociétés du groupe</h1>
          <p className="text-sm text-slate-500">
            Rattachez une filiale à sa société mère pour construire la hiérarchie du groupe. Cliquez sur une société pour voir
            sa fiche.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nouvelle société</Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle société">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex : Meninx Agro)"
            className={`w-full ${inputClass}`}
          />
          <div className="flex gap-3">
            <select value={type} onChange={(e) => setType(e.target.value as CompanyType)} className={`flex-1 ${inputClass}`}>
              <option value="FILIALE">Filiale</option>
              <option value="HOLDING">Holding</option>
            </select>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={`flex-1 ${inputClass}`}>
              <option value="">Aucune société mère</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {services && services.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Services activés pour cette société</label>
              <div className="grid grid-cols-2 gap-1.5 rounded-md border border-slate-200 p-3">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={createMutation.isPending}>
              Ajouter
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}
            {rows.map(({ company: c, depth }) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">
                  <span style={{ paddingLeft: `${depth * 20}px` }} className="inline-flex items-center gap-1">
                    {depth > 0 && <span className="text-slate-300">↳</span>}
                    <Link to={`/admin/companies/${c.id}`} className="text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                  </span>
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
