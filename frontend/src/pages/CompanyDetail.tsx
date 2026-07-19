import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import type { Asset, Company, CompanyType, License, OrgUser, Service, User } from "../types";
import { OrgChart } from "../components/OrgChart";

const TYPE_LABELS: Record<CompanyType, string> = {
  HOLDING: "Holding",
  FILIALE: "Filiale",
};

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface CompanyDetailData extends Company {
  children: { id: string; name: string; type: CompanyType; isActive: boolean }[];
  users: OrgUser[];
  _count: { users: number };
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("FILIALE");
  const [parentId, setParentId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => (await apiClient.get<{ company: CompanyDetailData }>(`/companies/${id}`)).data.company,
    enabled: Boolean(id),
  });

  const { data: allCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const { data: allServices } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await apiClient.get<{ services: Service[] }>("/services")).data.services,
  });

  const { data: users } = useQuery({
    queryKey: ["users", { companyId: id }],
    queryFn: async () => (await apiClient.get<{ users: User[] }>("/users", { params: { companyId: id } })).data.users,
    enabled: Boolean(id),
  });

  const { data: assets } = useQuery({
    queryKey: ["assets", { companyId: id }],
    queryFn: async () => (await apiClient.get<{ assets: Asset[] }>("/assets", { params: { companyId: id } })).data.assets,
    enabled: Boolean(id),
  });

  const { data: licenses } = useQuery({
    queryKey: ["licenses", { companyId: id }],
    queryFn: async () => (await apiClient.get<{ licenses: License[] }>("/licenses", { params: { companyId: id } })).data.licenses,
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/companies/${id}`, { name, type, parentId: parentId || null, serviceIds }),
    onSuccess: () => {
      toast.success("Société mise à jour");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour la société");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/companies/${id}`, { isActive: !company!.isActive }),
    onSuccess: () => {
      toast.success(company?.isActive ? "Société désactivée" : "Société activée");
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/companies/${id}`),
    onSuccess: () => {
      toast.success("Société supprimée");
      navigate("/admin/companies");
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "Impossible de supprimer la société"));
      setConfirmDelete(false);
    },
  });

  function startEdit() {
    if (!company) return;
    setName(company.name);
    setType(company.type);
    setParentId(company.parentId ?? "");
    setServiceIds((company.services ?? []).map((s) => s.id));
    setError(null);
    setEditing(true);
  }

  function toggleService(serviceId: string) {
    setServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  }

  if (isLoading || !company) {
    return <PageSpinner label="Chargement de la fiche…" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/companies")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Retour aux sociétés
      </button>

      <Card className="mb-4 p-6">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nom</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as CompanyType)} className={inputClass}>
                  <option value="FILIALE">Filiale</option>
                  <option value="HOLDING">Holding</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Société mère</label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
                  <option value="">Aucune</option>
                  {allCompanies
                    ?.filter((c) => c.id !== company.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Services activés</label>
              <div className="grid grid-cols-2 gap-1.5 rounded-md border border-slate-200 p-3">
                {allServices?.map((s) => (
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
            <div className="flex gap-2">
              <Button type="submit" loading={updateMutation.isPending}>
                Enregistrer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    company.type === "HOLDING" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {TYPE_LABELS[company.type]}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    company.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${company.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {company.isActive ? "Active" : "Désactivée"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <div>
                Société mère :{" "}
                {company.parent ? (
                  <Link to={`/admin/companies/${company.parent.id}`} className="text-brand-700 hover:underline">
                    {company.parent.name}
                  </Link>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>
              <div>
                Utilisateurs : <span className="text-slate-700">{company._count.users}</span>
              </div>
              <div className="col-span-2">
                Services activés :{" "}
                {company.services && company.services.length > 0 ? (
                  <span className="inline-flex flex-wrap gap-1.5 align-middle">
                    {company.services.map((s) => (
                      <span key={s.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {s.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" onClick={startEdit}>
                Modifier
              </Button>
              <Button size="sm" variant="secondary" loading={toggleActiveMutation.isPending} onClick={() => toggleActiveMutation.mutate()}>
                {company.isActive ? "Désactiver" : "Activer"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette société ?"
        description={`${company.name} sera définitivement supprimée. Si des utilisateurs, filiales, matériels ou licences lui sont liés, désactivez-la plutôt.`}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />

      {company.children.length > 0 && (
        <Card className="mb-4 p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Filiales rattachées</h2>
          <ul className="space-y-1.5">
            {company.children.map((c) => (
              <li key={c.id}>
                <Link to={`/admin/companies/${c.id}`} className="text-sm text-brand-700 hover:underline">
                  {c.name}
                </Link>
                {!c.isActive && <span className="ml-2 text-xs text-slate-400">(désactivée)</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-4 p-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Organigramme</h2>
        <p className="mb-3 text-xs text-slate-400">
          Construit manuellement via le supérieur hiérarchique renseigné sur chaque fiche utilisateur.
        </p>
        <OrgChart users={company.users} />
      </Card>

      <Card className="mb-4 p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Matériel affecté</h2>
        {assets?.length === 0 && <p className="text-sm text-slate-400">Aucun matériel affecté à cette société</p>}
        <ul className="space-y-1.5">
          {assets?.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <Link to="/admin/assets" className="truncate text-brand-700 hover:underline">
                {a.name} <span className="text-xs text-slate-400">({a.assetType.name})</span>
              </Link>
              {a.serialNumber && <span className="text-xs text-slate-400">{a.serialNumber}</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-4 p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Licences</h2>
        {licenses?.length === 0 && <p className="text-sm text-slate-400">Aucune licence affectée à cette société</p>}
        <ul className="space-y-1.5">
          {licenses?.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
              <Link to="/admin/licenses" className="truncate text-brand-700 hover:underline">
                {l.name}
              </Link>
              <span className="text-xs text-slate-400">expire le {new Date(l.expiryDate).toLocaleDateString("fr-FR")}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Utilisateurs de cette société</h2>
        {users?.length === 0 && <p className="text-sm text-slate-400">Aucun utilisateur</p>}
        <ul className="space-y-1.5">
          {users?.map((u) => (
            <li key={u.id} className="flex items-center justify-between text-sm">
              <Link to={`/admin/users/${u.id}`} className="text-brand-700 hover:underline">
                {u.name}
              </Link>
              <span className="text-xs text-slate-400">{u.service?.name ?? "—"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
