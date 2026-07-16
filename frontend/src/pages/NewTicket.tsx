import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { IconLightbulb, IconWorkflow } from "../components/icons";
import type { Category, KnowledgeArticle, Priority, Process, SubCategory, Ticket, TicketType } from "../types";

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
  const [priorityId, setPriorityId] = useState("");
  const [processId, setProcessId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUseProcesses = Boolean(user?.isDepartmentHead) || user?.role === "ADMIN";

  const { data: processes } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => (await apiClient.get<{ processes: Process[] }>("/processes")).data.processes,
    enabled: canUseProcesses,
  });
  const activeProcesses = processes?.filter((p) => p.isActive) ?? [];
  const selectedProcess = activeProcesses.find((p) => p.id === processId) ?? null;

  const { data: ticketTypes } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => (await apiClient.get<{ ticketTypes: TicketType[] }>("/ticket-types")).data.ticketTypes,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const { data: subCategories } = useQuery({
    queryKey: ["subcategories", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ subCategories: SubCategory[] }>("/subcategories", { params: { categoryId } })
      ).data.subCategories,
    enabled: Boolean(categoryId),
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const { data: suggestedArticles } = useQuery({
    queryKey: ["knowledge", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ articles: KnowledgeArticle[] }>("/knowledge", { params: { categoryId } })
      ).data.articles,
    enabled: Boolean(categoryId),
  });

  const activeSubCategories = subCategories?.filter((s) => s.isActive) ?? [];

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    setSubCategoryId("");
  }

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<{ ticket: Ticket }>("/tickets", {
          title,
          description,
          typeId,
          categoryId,
          subCategoryId: subCategoryId || undefined,
          priorityId,
          processId: processId || undefined,
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
    <div className="mx-auto max-w-3xl">
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

          {canUseProcesses && activeProcesses.length > 0 && (
            <div className="rounded-md border border-brand-200 bg-brand-50 p-3">
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <IconWorkflow className="h-4 w-4" /> Processus IT (optionnel)
              </label>
              <select value={processId} onChange={(e) => setProcessId(e.target.value)} className={`${inputClass} bg-white`}>
                <option value="">Aucun — demande standard</option>
                {activeProcesses.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedProcess && (
                <p className="mt-2 text-xs text-brand-800">
                  {selectedProcess.requiresManagerApproval &&
                    "Cette demande nécessitera la validation de votre supérieur hiérarchique avant prise en charge par l'IT. "}
                  {selectedProcess.requiresPhysicalForm &&
                    "Un formulaire signé devra être scanné puis remis en physique à l'équipe IT pour archivage."}
                </p>
              )}
            </div>
          )}

          {!canUseProcesses && (
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <IconWorkflow className="h-3.5 w-3.5 shrink-0" />
              Certaines demandes (remplacement de matériel, arrivée d'un collaborateur, acquisition de licence…) suivent un
              processus dédié réservé aux responsables de service. Un administrateur peut activer ce statut depuis votre
              fiche utilisateur.
            </p>
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type de demande</label>
            <select required value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputClass}>
              <option value="">Sélectionner…</option>
              {ticketTypes
                ?.filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
              <select required value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} className={inputClass}>
                <option value="">Sélectionner…</option>
                {categories
                  ?.filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sous-catégorie</label>
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                disabled={!categoryId || activeSubCategories.length === 0}
                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">
                  {categoryId && activeSubCategories.length === 0 ? "Aucune" : "Sélectionner (optionnel)…"}
                </option>
                {activeSubCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
            <select required value={priorityId} onChange={(e) => setPriorityId(e.target.value)} className={inputClass}>
              <option value="">Sélectionner…</option>
              {priorities?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

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
    </div>
  );
}
