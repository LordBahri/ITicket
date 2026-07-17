import { Fragment, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Process, ProcessCategory, ProcessStep } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const CATEGORY_LABELS: Record<ProcessCategory, string> = {
  CHANGE_ENABLEMENT: "Gestion des changements",
  REQUEST_FULFILLMENT: "Exécution des demandes",
  ACCESS_MANAGEMENT: "Gestion des accès",
  ASSET_MANAGEMENT: "Gestion des actifs",
  ONBOARDING: "Arrivée (onboarding)",
  OFFBOARDING: "Départ (offboarding)",
};

function ProcessStepManager({ process }: { process: Process }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post(`/processes/${process.id}/steps`, { name, order: process.steps.length }),
    onSuccess: () => {
      setName("");
      toast.success("Étape ajoutée");
      queryClient.invalidateQueries({ queryKey: ["processes"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible d'ajouter l'étape")),
  });

  const toggleMutation = useMutation({
    mutationFn: async (step: ProcessStep) => apiClient.patch(`/processes/steps/${step.id}`, { isActive: !step.isActive }),
    onSuccess: () => {
      toast.success("Étape mise à jour");
      queryClient.invalidateQueries({ queryKey: ["processes"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist du processus</p>
      {process.steps.length === 0 && <p className="mb-2 text-xs text-slate-400">Aucune étape définie</p>}
      <ol className="mb-3 space-y-1">
        {process.steps.map((step, i) => (
          <li key={step.id} className="flex items-center justify-between gap-2 text-sm">
            <span className={step.isActive ? "text-slate-700" : "text-slate-400 line-through"}>
              {i + 1}. {step.name}
            </span>
            <button
              onClick={() => toggleMutation.mutate(step)}
              className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
            >
              {step.isActive ? "Désactiver" : "Activer"}
            </button>
          </li>
        ))}
      </ol>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouvelle étape…"
          className={`flex-1 ${inputClass} py-1.5 text-xs`}
        />
        <Button type="submit" size="sm" loading={createMutation.isPending}>
          Ajouter
        </Button>
      </form>
    </div>
  );
}

export function AdminProcesses() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProcessCategory>("REQUEST_FULFILLMENT");
  const [description, setDescription] = useState("");
  const [requiresManagerApproval, setRequiresManagerApproval] = useState(true);
  const [requiresPhysicalForm, setRequiresPhysicalForm] = useState(false);
  const [formTemplateUrl, setFormTemplateUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: processes, isLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => (await apiClient.get<{ processes: Process[] }>("/processes")).data.processes,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/processes", {
        name,
        category,
        description: description || undefined,
        requiresManagerApproval,
        requiresPhysicalForm,
        formTemplateUrl: formTemplateUrl || undefined,
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setFormTemplateUrl("");
      setRequiresManagerApproval(true);
      setRequiresPhysicalForm(false);
      setShowForm(false);
      toast.success("Processus créé");
      queryClient.invalidateQueries({ queryKey: ["processes"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer le processus");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (process: Process) => apiClient.patch(`/processes/${process.id}`, { isActive: !process.isActive }),
    onSuccess: () => {
      toast.success("Processus mis à jour");
      queryClient.invalidateQueries({ queryKey: ["processes"] });
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Processus IT</h1>
          <p className="text-sm text-slate-500">
            Catalogue des processus formalisés (ITIL) : remplacement de matériel, onboarding, offboarding, acquisition de
            licence, accès applicatif. Réservés aux responsables de service, avec validation du supérieur hiérarchique.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nouveau processus</Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau processus" size="lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom (ex : Remplacement de matériel)"
              className={inputClass}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value as ProcessCategory)} className={inputClass}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            className={`w-full ${inputClass}`}
          />
          <input
            value={formTemplateUrl}
            onChange={(e) => setFormTemplateUrl(e.target.value)}
            placeholder="Lien du formulaire (ex : /forms/formulaire-xxx.docx)"
            className={`w-full ${inputClass}`}
          />
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={requiresManagerApproval}
                onChange={(e) => setRequiresManagerApproval(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Nécessite la validation du supérieur hiérarchique
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={requiresPhysicalForm}
                onChange={(e) => setRequiresPhysicalForm(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Nécessite un formulaire signé, scanné puis archivé physiquement
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={createMutation.isPending}>
              Créer le processus
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
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Validation</th>
              <th className="px-4 py-2">Formulaire</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
            {processes?.map((p) => (
              <Fragment key={p.id}>
                <tr
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <span className={`mr-1 inline-block transition-transform ${expanded === p.id ? "rotate-90" : ""}`}>›</span>
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{CATEGORY_LABELS[p.category]}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.requiresManagerApproval ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.requiresManagerApproval ? "Requise" : "Non requise"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {p.requiresPhysicalForm ? (
                      p.formTemplateUrl ? (
                        <a
                          href={p.formTemplateUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          Télécharger le modèle
                        </a>
                      ) : (
                        <span className="text-xs text-amber-600">Requis (aucun modèle)</span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">Non requis</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        p.isActive ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {p.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate(p);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                    >
                      {p.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <ProcessStepManager process={p} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
