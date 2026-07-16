import { Fragment, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Asset, AssetStatus, AssetType, Company, User } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const STATUS_LABELS: Record<AssetStatus, string> = {
  EN_SERVICE: "En service",
  EN_STOCK: "En stock",
  EN_MAINTENANCE: "En maintenance",
  RETIRE: "Retiré",
};

const STATUS_CLASSES: Record<AssetStatus, string> = {
  EN_SERVICE: "bg-emerald-50 text-emerald-600",
  EN_STOCK: "bg-slate-100 text-slate-500",
  EN_MAINTENANCE: "bg-amber-50 text-amber-600",
  RETIRE: "bg-red-50 text-red-500",
};

function AssetTypeManager({ assetTypes }: { assetTypes: AssetType[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/asset-types", { name }),
    onSuccess: () => {
      setName("");
      toast.success("Type de matériel créé");
      queryClient.invalidateQueries({ queryKey: ["asset-types"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de créer le type")),
  });

  const toggleMutation = useMutation({
    mutationFn: async (assetType: AssetType) => apiClient.patch(`/asset-types/${assetType.id}`, { isActive: !assetType.isActive }),
    onSuccess: () => {
      toast.success("Type de matériel mis à jour");
      queryClient.invalidateQueries({ queryKey: ["asset-types"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Types de matériel</h2>
      <ul className="mb-3 flex flex-wrap gap-2">
        {assetTypes.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => toggleMutation.mutate(t)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                t.isActive
                  ? "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-600"
                  : "border-slate-200 bg-slate-100 text-slate-400 hover:text-emerald-600"
              }`}
              title={t.isActive ? "Cliquer pour désactiver" : "Cliquer pour activer"}
            >
              {t.name}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouveau type (ex : Tablette)…"
          className={`flex-1 ${inputClass} py-1.5 text-xs`}
        />
        <Button type="submit" size="sm" loading={createMutation.isPending}>
          Ajouter
        </Button>
      </form>
    </Card>
  );
}

type Assignment = "NONE" | "COMPANY" | "USER";

interface AssetFormState {
  name: string;
  assetTypeId: string;
  serialNumber: string;
  model: string;
  status: AssetStatus;
  purchaseDate: string;
  warrantyEndDate: string;
  notes: string;
  assignment: Assignment;
  companyId: string;
  assigneeId: string;
}

function emptyForm(defaultTypeId: string): AssetFormState {
  return {
    name: "",
    assetTypeId: defaultTypeId,
    serialNumber: "",
    model: "",
    status: "EN_STOCK",
    purchaseDate: "",
    warrantyEndDate: "",
    notes: "",
    assignment: "NONE",
    companyId: "",
    assigneeId: "",
  };
}

function AssetForm({
  assetTypes,
  companies,
  users,
  initial,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: {
  assetTypes: AssetType[];
  companies: Company[];
  users: User[];
  initial: AssetFormState;
  submitLabel: string;
  loading: boolean;
  onSubmit: (form: AssetFormState) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update<K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nom (ex : PC-DG-014)" className={inputClass} />
        <select required value={form.assetTypeId} onChange={(e) => update("assetTypeId", e.target.value)} className={inputClass}>
          <option value="">Type…</option>
          {assetTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input value={form.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} placeholder="Numéro de série" className={inputClass} />
        <input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="Modèle" className={inputClass} />
        <select value={form.status} onChange={(e) => update("status", e.target.value as AssetStatus)} className={inputClass}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date d'achat</label>
          <input type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} className={`w-full ${inputClass}`} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Fin de garantie</label>
          <input
            type="date"
            value={form.warrantyEndDate}
            onChange={(e) => update("warrantyEndDate", e.target.value)}
            className={`w-full ${inputClass}`}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Affectation</label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={form.assignment}
            onChange={(e) => update("assignment", e.target.value as Assignment)}
            className={inputClass}
          >
            <option value="NONE">Non affecté (stock)</option>
            <option value="COMPANY">Société (ex : switch, serveur, onduleur)</option>
            <option value="USER">Utilisateur (ex : PC, imprimante)</option>
          </select>
          {form.assignment === "COMPANY" && (
            <select required value={form.companyId} onChange={(e) => update("companyId", e.target.value)} className={inputClass}>
              <option value="">Société…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {form.assignment === "USER" && (
            <select required value={form.assigneeId} onChange={(e) => update("assigneeId", e.target.value)} className={inputClass}>
              <option value="">Utilisateur…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <textarea
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder="Notes (optionnel)"
        rows={2}
        className={`w-full ${inputClass}`}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}

function assetToForm(asset: Asset): AssetFormState {
  return {
    name: asset.name,
    assetTypeId: asset.assetType.id,
    serialNumber: asset.serialNumber ?? "",
    model: asset.model ?? "",
    status: asset.status,
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
    warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.slice(0, 10) : "",
    notes: asset.notes ?? "",
    assignment: asset.company ? "COMPANY" : asset.assignee ? "USER" : "NONE",
    companyId: asset.company?.id ?? "",
    assigneeId: asset.assignee?.id ?? "",
  };
}

function toPayload(form: AssetFormState) {
  return {
    name: form.name,
    assetTypeId: form.assetTypeId,
    serialNumber: form.serialNumber || null,
    model: form.model || null,
    status: form.status,
    purchaseDate: form.purchaseDate || null,
    warrantyEndDate: form.warrantyEndDate || null,
    notes: form.notes || null,
    companyId: form.assignment === "COMPANY" ? form.companyId : null,
    assigneeId: form.assignment === "USER" ? form.assigneeId : null,
  };
}

export function AdminAssets() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets", { status: statusFilter, companyId: companyFilter }],
    queryFn: async () =>
      (
        await apiClient.get<{ assets: Asset[] }>("/assets", {
          params: { status: statusFilter || undefined, companyId: companyFilter || undefined },
        })
      ).data.assets,
  });

  const { data: assetTypes } = useQuery({
    queryKey: ["asset-types"],
    queryFn: async () => (await apiClient.get<{ assetTypes: AssetType[] }>("/asset-types")).data.assetTypes,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get<{ users: User[] }>("/users")).data.users,
  });

  const createMutation = useMutation({
    mutationFn: async (form: AssetFormState) => apiClient.post("/assets", toPayload(form)),
    onSuccess: () => {
      setShowForm(false);
      toast.success("Matériel ajouté");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible d'ajouter le matériel")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: AssetFormState }) => apiClient.patch(`/assets/${id}`, toPayload(form)),
    onSuccess: () => {
      setEditingId(null);
      toast.success("Matériel mis à jour");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de mettre à jour le matériel")),
  });

  const activeAssetTypes = assetTypes?.filter((t) => t.isActive) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Matériel informatique</h1>
          <p className="text-sm text-slate-500">Affectez chaque équipement à une société (switch, onduleur, serveur…) ou à un utilisateur (PC, imprimante…).</p>
        </div>
        <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "+ Nouveau matériel"}
        </Button>
      </div>

      {assetTypes && <AssetTypeManager assetTypes={assetTypes} />}

      {showForm && (
        <Card className="mb-6 max-w-2xl p-5">
          <AssetForm
            assetTypes={activeAssetTypes}
            companies={companies ?? []}
            users={users ?? []}
            initial={emptyForm(activeAssetTypes[0]?.id ?? "")}
            submitLabel="Ajouter"
            loading={createMutation.isPending}
            onSubmit={(form) => createMutation.mutate(form)}
          />
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className={inputClass}>
          <option value="">Toutes les sociétés</option>
          {companies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">N° série</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Affecté à</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
            {assets?.map((asset) => (
              <Fragment key={asset.id}>
                <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{asset.name}</td>
                  <td className="px-4 py-2 text-slate-500">{asset.assetType.name}</td>
                  <td className="px-4 py-2 text-slate-500">{asset.serialNumber ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[asset.status]}`}>
                      {STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {asset.company && (
                      <Link to={`/admin/companies/${asset.company.id}`} className="text-brand-700 hover:underline">
                        {asset.company.name}
                      </Link>
                    )}
                    {asset.assignee && (
                      <Link to={`/admin/users/${asset.assignee.id}`} className="text-brand-700 hover:underline">
                        {asset.assignee.name}
                      </Link>
                    )}
                    {!asset.company && !asset.assignee && "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditingId(editingId === asset.id ? null : asset.id)}
                      className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                    >
                      {editingId === asset.id ? "Fermer" : "Modifier"}
                    </button>
                  </td>
                </tr>
                {editingId === asset.id && (
                  <tr>
                    <td colSpan={6} className="border-b border-slate-100 bg-slate-50 p-4">
                      <AssetForm
                        assetTypes={assetTypes ?? []}
                        companies={companies ?? []}
                        users={users ?? []}
                        initial={assetToForm(asset)}
                        submitLabel="Enregistrer"
                        loading={updateMutation.isPending}
                        onSubmit={(form) => updateMutation.mutate({ id: asset.id, form })}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!isLoading && assets?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                  Aucun matériel enregistré
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
