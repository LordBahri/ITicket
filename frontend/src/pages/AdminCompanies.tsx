import { useMemo, useState, type FormEvent } from "react";
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
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("FILIALE");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CompanyType>("FILIALE");
  const [editParentId, setEditParentId] = useState("");

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const rows = useMemo(() => buildTree(companies ?? []), [companies]);

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/companies", { name, type, parentId: parentId || null }),
    onSuccess: () => {
      setName("");
      setParentId("");
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

  const editMutation = useMutation({
    mutationFn: async (id: string) =>
      apiClient.patch(`/companies/${id}`, { name: editName, type: editType, parentId: editParentId || null }),
    onSuccess: () => {
      toast.success("Société mise à jour");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de mettre à jour la société")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    createMutation.mutate();
  }

  function startEdit(c: Company) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditType(c.type);
    setEditParentId(c.parentId ?? "");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Sociétés du groupe</h1>
      <p className="mb-6 text-sm text-slate-500">
        Rattachez une filiale à sa société mère pour construire la hiérarchie du groupe.
      </p>

      <Card className="mb-6 p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-3">
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
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
              <option value="">Aucune société mère</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button type="submit" loading={createMutation.isPending}>
              Ajouter
            </Button>
          </div>
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
            {rows.map(({ company: c, depth }) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                {editingId === c.id ? (
                  <>
                    <td className="px-4 py-2" colSpan={4}>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`flex-1 ${inputClass} py-1.5`}
                        />
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as CompanyType)}
                          className={`${inputClass} py-1.5`}
                        >
                          <option value="FILIALE">Filiale</option>
                          <option value="HOLDING">Holding</option>
                        </select>
                        <select
                          value={editParentId}
                          onChange={(e) => setEditParentId(e.target.value)}
                          className={`${inputClass} py-1.5`}
                        >
                          <option value="">Aucune société mère</option>
                          {companies
                            ?.filter((opt) => opt.id !== c.id)
                            .map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                        </select>
                        <Button size="sm" loading={editMutation.isPending} onClick={() => editMutation.mutate(c.id)}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Annuler
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      <span style={{ paddingLeft: `${depth * 20}px` }} className="inline-flex items-center gap-1">
                        {depth > 0 && <span className="text-slate-300">↳</span>}
                        {c.name}
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
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(c)}
                          className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                        >
                          {c.isActive ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
