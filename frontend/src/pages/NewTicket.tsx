import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { IconLightbulb, IconWorkflow, IconDownload } from "../components/icons";
import type { Category, KnowledgeArticle, Process, SubCategory, Ticket, TicketType } from "../types";

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function NewTicket() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [processId, setProcessId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formPromptProcess, setFormPromptProcess] = useState<Process | null>(null);

  const canUseProcesses = Boolean(user?.isDepartmentHead) || user?.role === "ADMIN";

  const { data: processes } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => (await apiClient.get<{ processes: Process[] }>("/processes")).data.processes,
  });
  const activeProcesses = processes?.filter((p) => p.isActive) ?? [];
  const visibleProcesses = canUseProcesses ? activeProcesses : activeProcesses.filter((p) => p.openToAllUsers);
  const selectedProcess = activeProcesses.find((p) => p.id === processId) ?? null;

  // Les types de demande utilisés par au moins un processus actif sont réservés à
  // ce processus : on ne les propose pas dans le choix "type de demande" d'un
  // ticket standard, seule la sélection d'un processus permet d'y accéder.
  const reservedTypeIds = useMemo(() => new Set(activeProcesses.map((p) => p.typeId)), [activeProcesses]);

  const { data: ticketTypes } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => (await apiClient.get<{ ticketTypes: TicketType[] }>("/ticket-types")).data.ticketTypes,
  });
  const availableTypes = (ticketTypes ?? []).filter((t) => t.isActive && !reservedTypeIds.has(t.id));

  const { data: categories } = useQuery({
    queryKey: ["categories", { typeId }],
    queryFn: async () =>
      (await apiClient.get<{ categories: Category[] }>("/categories", { params: { ticketTypeId: typeId } })).data.categories,
    enabled: Boolean(typeId),
  });
  const activeCategories = categories?.filter((c) => c.isActive) ?? [];

  const { data: subCategories } = useQuery({
    queryKey: ["subcategories", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ subCategories: SubCategory[] }>("/subcategories", { params: { categoryId } })
      ).data.subCategories,
    enabled: Boolean(categoryId),
  });
  const activeSubCategories = subCategories?.filter((s) => s.isActive) ?? [];

  const { data: directory } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: async () => (await apiClient.get<{ users: DirectoryUser[] }>("/users/directory")).data.users,
    enabled: Boolean(processId),
  });

  const { data: suggestedArticles } = useQuery({
    queryKey: ["knowledge", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ articles: KnowledgeArticle[] }>("/knowledge", { params: { categoryId } })
      ).data.articles,
    enabled: Boolean(categoryId) && !processId,
  });

  function handleTypeChange(value: string) {
    setTypeId(value);
    setCategoryId("");
    setSubCategoryId("");
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    setSubCategoryId("");
  }

  function handleProcessChange(value: string) {
    setProcessId(value);
    setBeneficiaryId("");
    if (value) {
      setTypeId("");
      setCategoryId("");
      setSubCategoryId("");
      const proc = visibleProcesses.find((p) => p.id === value);
      if (proc?.requiresPhysicalForm) setFormPromptProcess(proc);
    }
  }

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<{ ticket: Ticket }>("/tickets", {
          title,
          description,
          typeId: processId ? undefined : typeId,
          categoryId: processId ? undefined : categoryId,
          subCategoryId: processId ? undefined : subCategoryId,
          processId: processId || undefined,
          beneficiaryId: beneficiaryId || undefined,
        })
      ).data.ticket,
    onSuccess: async (ticket) => {
      if (files && files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append("files", file));
        try {
          await apiClient.post(`/tickets/${ticket.id}/attachments`, formData);
        } catch {
          toast.info("Ticket créé, mais l'envoi des pièces jointes a échoué — réessayez depuis la page du ticket");
        }
      }
      toast.success(
        ticket.status === "PENDING_APPROVAL"
          ? `Demande ${ticket.reference} créée — en attente de validation de votre supérieur hiérarchique`
          : `Ticket ${ticket.reference} créé`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer le ticket");
      setError(msg);
      toast.error(msg);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Nouveau ticket</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="animate-fade-in rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Mon PC ne démarre plus"
              className={inputClass}
            />
          </div>

          {visibleProcesses.length > 0 && (
            <div className="rounded-md border border-brand-200 bg-brand-50 p-3">
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <IconWorkflow className="h-4 w-4" /> Processus IT (optionnel)
              </label>
              <select value={processId} onChange={(e) => handleProcessChange(e.target.value)} className={`${inputClass} bg-white`}>
                <option value="">Aucun — demande standard</option>
                {visibleProcesses.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedProcess && (
                <div className="mt-2 space-y-2 text-xs text-brand-800">
                  <p>
                    Classé automatiquement sous : <strong>{selectedProcess.ticketType?.name}</strong> ›{" "}
                    <strong>{selectedProcess.ticketCategory?.name}</strong> › <strong>{selectedProcess.subCategory?.name}</strong>
                  </p>
                  {selectedProcess.requiresManagerApproval &&
                    "Cette demande nécessitera la validation de votre supérieur hiérarchique avant prise en charge par l'IT. "}
                  {selectedProcess.requiresPhysicalForm && (
                    <p>
                      Un formulaire signé devra être scanné puis remis en physique à l'équipe IT pour archivage.
                      {selectedProcess.formTemplateUrl && (
                        <>
                          {" "}
                          <a
                            href={selectedProcess.formTemplateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-brand-900 hover:underline"
                          >
                            <IconDownload className="h-3.5 w-3.5" /> Télécharger le formulaire
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {visibleProcesses.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <IconWorkflow className="h-3.5 w-3.5 shrink-0" />
              Certaines demandes (remplacement de matériel, arrivée d'un collaborateur, acquisition de licence…) suivent un
              processus dédié réservé aux responsables de service. Un administrateur peut activer ce statut depuis votre
              fiche utilisateur.
            </p>
          )}

          {processId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Utilisateur bénéficiaire (optionnel)</label>
              <select value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)} className={inputClass}>
                <option value="">Aucun — la demande me concerne</option>
                {directory?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Sélectionnez la personne concernée par cette demande si ce n'est pas vous (ex : nouvel employé pour un
                onboarding).
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème ou la demande en détail…"
              className={inputClass}
            />
          </div>

          {!processId && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type de demande</label>
                <select required value={typeId} onChange={(e) => handleTypeChange(e.target.value)} className={inputClass}>
                  <option value="">Sélectionner…</option>
                  {availableTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={!typeId}
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    <option value="">{typeId ? "Sélectionner…" : "Choisissez d'abord un type"}</option>
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sous-catégorie</label>
                  <select
                    required
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    disabled={!categoryId}
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    <option value="">{categoryId ? "Sélectionner…" : "Choisissez d'abord une catégorie"}</option>
                    {activeSubCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {suggestedArticles && suggestedArticles.length > 0 && (
            <div className="animate-fade-in rounded-md border border-brand-200 bg-brand-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <IconLightbulb className="h-4 w-4" /> Ces articles pourraient répondre à votre demande :
              </p>
              <ul className="space-y-1">
                {suggestedArticles.map((a) => (
                  <li key={a.id}>
                    <Link to={`/knowledge/${a.id}`} target="_blank" className="text-sm text-brand-700 underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pièces jointes (optionnel)</label>
            <input type="file" multiple onChange={(e) => setFiles(e.target.files)} className={`${inputClass} py-1.5`} />
          </div>

          <Button type="submit" loading={mutation.isPending}>
            Créer le ticket
          </Button>
        </form>
      </Card>

      <Modal
        open={Boolean(formPromptProcess)}
        onClose={() => setFormPromptProcess(null)}
        title="Formulaire à imprimer requis"
        size="sm"
      >
        {formPromptProcess && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Le processus <strong>{formPromptProcess.name}</strong> nécessite un formulaire signé. Téléchargez-le dès
              maintenant, remplissez-le et imprimez-le : vous devrez le faire signer puis le remettre en physique à
              l'équipe IT une fois le ticket créé.
            </p>
            <div className="flex gap-2">
              {formPromptProcess.formTemplateUrl && (
                <a
                  href={formPromptProcess.formTemplateUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setFormPromptProcess(null)}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  <IconDownload className="h-4 w-4" /> Télécharger le formulaire
                </a>
              )}
              <Button variant="secondary" type="button" onClick={() => setFormPromptProcess(null)}>
                Continuer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
