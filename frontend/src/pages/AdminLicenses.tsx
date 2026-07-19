import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { CompanyStatsBar } from "../components/ui/CompanyStatsBar";
import { groupByCompany, companyStats } from "../utils/companyGrouping";
import type { Company, License } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface LicenseFormState {
  name: string;
  vendor: string;
  licenseKey: string;
  seats: string;
  startDate: string;
  expiryDate: string;
  notes: string;
  companyId: string;
}

function emptyForm(): LicenseFormState {
  return { name: "", vendor: "", licenseKey: "", seats: "1", startDate: "", expiryDate: "", notes: "", companyId: "" };
}

function licenseToForm(license: License): LicenseFormState {
  return {
    name: license.name,
    vendor: license.vendor ?? "",
    licenseKey: license.licenseKey ?? "",
    seats: String(license.seats),
    startDate: license.startDate ? license.startDate.slice(0, 10) : "",
    expiryDate: license.expiryDate.slice(0, 10),
    notes: license.notes ?? "",
    companyId: license.company?.id ?? "",
  };
}

function toPayload(form: LicenseFormState) {
  return {
    name: form.name,
    vendor: form.vendor || null,
    licenseKey: form.licenseKey || null,
    seats: Number(form.seats) || 1,
    startDate: form.startDate || null,
    expiryDate: form.expiryDate,
    notes: form.notes || null,
    companyId: form.companyId || null,
  };
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const remaining = daysUntil(expiryDate);
  let classes = "bg-emerald-50 text-emerald-600";
  let label = `${remaining} j restants`;
  if (remaining < 0) {
    classes = "bg-red-50 text-red-600";
    label = "Expirée";
  } else if (remaining <= 7) {
    classes = "bg-red-50 text-red-600";
  } else if (remaining <= 30) {
    classes = "bg-amber-50 text-amber-600";
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{label}</span>;
}

function LicenseForm({
  companies,
  initial,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: {
  companies: Company[];
  initial: LicenseFormState;
  submitLabel: string;
  loading: boolean;
  onSubmit: (form: LicenseFormState) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update<K extends keyof LicenseFormState>(key: K, value: LicenseFormState[K]) {
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
        <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nom (ex : Microsoft 365 E3)" className={inputClass} />
        <input value={form.vendor} onChange={(e) => update("vendor", e.target.value)} placeholder="Éditeur" className={inputClass} />
        <input value={form.licenseKey} onChange={(e) => update("licenseKey", e.target.value)} placeholder="Clé de licence (optionnel)" className={inputClass} />
        <input
          type="number"
          min={1}
          value={form.seats}
          onChange={(e) => update("seats", e.target.value)}
          placeholder="Nombre de sièges"
          className={inputClass}
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date de début</label>
          <input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} className={`w-full ${inputClass}`} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date d'expiration</label>
          <input required type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} className={`w-full ${inputClass}`} />
        </div>
        <select value={form.companyId} onChange={(e) => update("companyId", e.target.value)} className={inputClass}>
          <option value="">Toutes sociétés</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder="Notes (optionnel)"
        rows={2}
        className={`w-full ${inputClass}`}
      />

      <p className="text-xs text-slate-400">
        Des rappels par email sont envoyés automatiquement aux administrateurs à J-30, J-7 et J-1 avant l'expiration.
      </p>

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

export function AdminLicenses() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => (await apiClient.get<{ licenses: License[] }>("/licenses")).data.licenses,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const createMutation = useMutation({
    mutationFn: async (form: LicenseFormState) => apiClient.post("/licenses", toPayload(form)),
    onSuccess: () => {
      setShowForm(false);
      toast.success("Licence créée");
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de créer la licence")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: LicenseFormState }) => apiClient.patch(`/licenses/${id}`, toPayload(form)),
    onSuccess: () => {
      setEditingId(null);
      toast.success("Licence mise à jour");
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de mettre à jour la licence")),
  });

  const licenseGroups = groupByCompany(licenses ?? [], companies ?? [], (l) => l.company?.id).groups;
  const stats = companyStats(licenses ?? [], companies ?? [], (l) => l.company?.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Licences</h1>
          <p className="text-sm text-slate-500">Suivi des licences logicielles et rappels automatiques avant expiration.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nouvelle licence</Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle licence" size="lg">
        <LicenseForm companies={companies ?? []} initial={emptyForm()} submitLabel="Créer" loading={createMutation.isPending} onSubmit={(form) => createMutation.mutate(form)} />
      </Modal>

      {!isLoading && licenses && licenses.length > 0 && (
        <CompanyStatsBar
          stats={stats.stats}
          unassignedCount={stats.unassignedCount}
          unassignedLabel="Toutes sociétés"
          total={stats.total}
          totalLabel="licences"
        />
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Éditeur</th>
              <th className="px-4 py-2">Sièges</th>
              <th className="px-4 py-2">Société</th>
              <th className="px-4 py-2">Expiration</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
            {licenseGroups.map((group) => (
              <Fragment key={group.companyId}>
                <tr className="bg-slate-100">
                  <td colSpan={6} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {group.companyName} <span className="font-normal normal-case text-slate-400">({group.items.length})</span>
                  </td>
                </tr>
                {group.items.map((license) => (
                  <Fragment key={license.id}>
                    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{license.name}</td>
                      <td className="px-4 py-2 text-slate-500">{license.vendor ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-500">{license.seats}</td>
                      <td className="px-4 py-2 text-slate-500">{license.company?.name ?? "Toutes sociétés"}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{new Date(license.expiryDate).toLocaleDateString("fr-FR")}</span>
                          <ExpiryBadge expiryDate={license.expiryDate} />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setEditingId(editingId === license.id ? null : license.id)}
                          className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                        >
                          {editingId === license.id ? "Fermer" : "Modifier"}
                        </button>
                      </td>
                    </tr>
                    {editingId === license.id && (
                      <tr>
                        <td colSpan={6} className="border-b border-slate-100 bg-slate-50 p-4">
                          <LicenseForm
                            companies={companies ?? []}
                            initial={licenseToForm(license)}
                            submitLabel="Enregistrer"
                            loading={updateMutation.isPending}
                            onSubmit={(form) => updateMutation.mutate({ id: license.id, form })}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </Fragment>
            ))}
            {!isLoading && licenses?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                  Aucune licence enregistrée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
