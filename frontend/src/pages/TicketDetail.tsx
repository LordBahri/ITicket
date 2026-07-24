import { useState, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { IconAlertTriangle, IconWorkflow, IconStar } from "../components/icons";
import type { ProcessCategory, SageAutomationResult, Ticket, User, TicketStatus } from "../types";
import { IconCheckCircle, IconXCircle } from "../components/icons";
import { AttachmentsPanel } from "../components/AttachmentsPanel";
import { TicketStatusTimeline } from "../components/TicketStatusTimeline";
import { STATUS_LABELS } from "../constants/ticketStatus";
import { formatDuration } from "../utils/duration";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"];

const selectClass =
  "rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const PROCESS_CATEGORY_LABELS: Record<ProcessCategory, string> = {
  CHANGE_ENABLEMENT: "Gestion des changements",
  REQUEST_FULFILLMENT: "Exécution des demandes",
  ACCESS_MANAGEMENT: "Gestion des accès",
  ASSET_MANAGEMENT: "Gestion des actifs",
  ONBOARDING: "Arrivée (onboarding)",
  OFFBOARDING: "Départ (offboarding)",
};

function ProcessPanel({
  ticket,
  isStaff,
  isAdmin,
  currentUserId,
}: {
  ticket: Ticket;
  isStaff: boolean;
  isAdmin: boolean;
  currentUserId?: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejectComment, setRejectComment] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async () => apiClient.post(`/tickets/${ticket.id}/approve`, {}),
    onSuccess: () => {
      toast.success("Demande validée");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de valider la demande")),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => apiClient.post(`/tickets/${ticket.id}/reject`, { comment: rejectComment }),
    onSuccess: () => {
      toast.success("Demande refusée");
      setShowReject(false);
      setRejectComment("");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de refuser la demande")),
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ completionId, isDone }: { completionId: string; isDone: boolean }) =>
      apiClient.patch(`/tickets/${ticket.id}/steps/${completionId}`, { isDone }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] }),
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  const archiveFormMutation = useMutation({
    mutationFn: async () => apiClient.post(`/tickets/${ticket.id}/archive-form`, {}),
    onSuccess: () => {
      toast.success("Formulaire physique marqué comme archivé");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  const [sageResult, setSageResult] = useState<SageAutomationResult | null>(null);
  const automateSageMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ result: SageAutomationResult }>(`/tickets/${ticket.id}/automate-sage-access`, {})).data.result,
    onSuccess: (result) => {
      setSageResult(result);
      const allOk = result.rdp.ok && result.files.ok && result.sql.ok;
      if (allOk) toast.success("Automatisation Sage terminée avec succès");
      else toast.error("Automatisation Sage terminée avec des erreurs — voir le détail ci-dessous");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de lancer l'automatisation")),
  });

  if (!ticket.process) return null;

  const approval = ticket.approval;
  const isApprover = approval?.approver.id === currentUserId;
  const canDecide = approval?.status === "PENDING" && (isApprover || isAdmin);

  return (
    <Card className="mb-4 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <IconWorkflow className="h-4 w-4 text-brand-600" /> Processus IT : {ticket.process.name}
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {PROCESS_CATEGORY_LABELS[ticket.process.category]}
        </span>
      </div>

      {approval && (
        <div className="mb-4 rounded-md border border-slate-200 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Validation hiérarchique — <span className="font-medium">{approval.approver.name}</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                approval.status === "PENDING"
                  ? "bg-purple-100 text-purple-700"
                  : approval.status === "APPROVED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {approval.status === "PENDING" ? "En attente" : approval.status === "APPROVED" ? "Validée" : "Refusée"}
            </span>
          </div>
          {approval.comment && <p className="text-sm text-slate-500">Motif : {approval.comment}</p>}

          {canDecide && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {!showReject ? (
                <div className="flex gap-2">
                  <Button size="sm" loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                    Approuver
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowReject(true)}>
                    Refuser
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    required
                    rows={2}
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Motif du refus (obligatoire)…"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      loading={rejectMutation.isPending}
                      disabled={rejectComment.trim().length < 3}
                      onClick={() => rejectMutation.mutate()}
                    >
                      Confirmer le refus
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowReject(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isStaff && ticket.stepCompletions && ticket.stepCompletions.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist de traitement</p>
          <ul className="space-y-1.5">
            {ticket.stepCompletions.map((sc) => (
              <li key={sc.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sc.isDone}
                  onChange={(e) => toggleStepMutation.mutate({ completionId: sc.id, isDone: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className={sc.isDone ? "text-slate-400 line-through" : "text-slate-700"}>{sc.processStep.name}</span>
                {sc.isDone && sc.doneBy && <span className="text-xs text-slate-400">— {sc.doneBy.name}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isStaff && ticket.process.supportsSageAutomation && (
        <div className="mb-4 rounded-md border border-brand-200 bg-brand-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm text-brand-900">
              Automatise l'ajout au groupe RDP du serveur applicatif, la copie des fichiers .gcm/.mae et la sécurité SQL
              Server pour cet accès Sage. La création de l'utilisateur dans Sage reste manuelle.
            </p>
            <Button size="sm" loading={automateSageMutation.isPending} onClick={() => automateSageMutation.mutate()}>
              Automatiser
            </Button>
          </div>
          {sageResult && (
            <ul className="space-y-1 border-t border-brand-100 pt-2 text-sm">
              {(
                [
                  ["rdp", "Accès RDP (serveur applicatif)"],
                  ["files", "Copie des fichiers .gcm/.mae"],
                  ["sql", "Sécurité SQL Server"],
                ] as const
              ).map(([key, label]) => (
                <li key={key} className="flex items-start gap-1.5">
                  {sageResult[key].ok ? (
                    <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <IconXCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <span className={sageResult[key].ok ? "text-emerald-800" : "text-red-700"}>
                    {label} {!sageResult[key].ok && `— ${sageResult[key].message}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {ticket.process.requiresPhysicalForm && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-sm text-amber-900">
            Ce processus nécessite un formulaire signé, scanné, puis remis en physique à l'équipe IT pour archivage
            (traçabilité pour audit).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {ticket.process.formTemplateUrl && (
              <a
                href={ticket.process.formTemplateUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Télécharger le modèle de formulaire
              </a>
            )}
            {ticket.physicalFormArchivedAt ? (
              <span className="text-sm text-emerald-700">
                Archivé le {new Date(ticket.physicalFormArchivedAt).toLocaleDateString("fr-FR")}
                {ticket.physicalFormArchivedBy && ` par ${ticket.physicalFormArchivedBy.name}`}
              </span>
            ) : (
              isStaff && (
                <Button size="sm" variant="secondary" loading={archiveFormMutation.isPending} onClick={() => archiveFormMutation.mutate()}>
                  Marquer l'original comme archivé
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function SatisfactionPanel({ ticket, isRequester }: { ticket: Ticket; isRequester: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const rateMutation = useMutation({
    mutationFn: async () => apiClient.post(`/tickets/${ticket.id}/satisfaction`, { rating, comment: comment || undefined }),
    onSuccess: () => {
      toast.success("Merci pour votre évaluation");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible d'enregistrer l'évaluation")),
  });

  const isResolvedOrClosed = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  if (!isResolvedOrClosed) return null;
  if (!ticket.satisfactionRatedAt && !isRequester) return null;

  return (
    <Card className="mb-4 p-6">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <IconStar className="h-4 w-4 text-amber-500" fill="currentColor" /> Satisfaction
      </h2>
      {ticket.satisfactionRatedAt ? (
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <IconStar
                key={i}
                className={`h-5 w-5 ${i <= (ticket.satisfactionRating ?? 0) ? "text-amber-400" : "text-slate-200"}`}
                fill="currentColor"
              />
            ))}
          </div>
          {ticket.satisfactionComment && <p className="mt-2 text-sm text-slate-600">{ticket.satisfactionComment}</p>}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm text-slate-600">Comment évaluez-vous la résolution de ce ticket ?</p>
          <div className="mb-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
              >
                <IconStar
                  className={`h-7 w-7 transition ${i <= (hoverRating || rating) ? "text-amber-400" : "text-slate-200"}`}
                  fill="currentColor"
                />
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)"
            className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <Button size="sm" disabled={rating === 0} loading={rateMutation.isPending} onClick={() => rateMutation.mutate()}>
            Envoyer mon évaluation
          </Button>
        </div>
      )}
    </Card>
  );
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await apiClient.get<{ ticket: Ticket }>(`/tickets/${id}`)).data.ticket,
    enabled: Boolean(id),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await apiClient.get<{ agents: User[] }>("/users/agents")).data.agents,
    enabled: isStaff,
  });

  const commentMutation = useMutation({
    mutationFn: async () => apiClient.post(`/tickets/${id}/comments`, { message, isInternal }),
    onSuccess: () => {
      setMessage("");
      setIsInternal(false);
      toast.success("Commentaire ajouté");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible d'ajouter le commentaire");
      setError(msg);
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<{ status: TicketStatus; assigneeId: string | null }>) =>
      apiClient.patch(`/tickets/${id}`, data),
    onSuccess: () => {
      toast.success("Ticket mis à jour");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour le ticket");
      setError(msg);
      toast.error(msg);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => apiClient.post(`/tickets/${id}/${ticket?.isArchived ? "unarchive" : "archive"}`),
    onSuccess: () => {
      toast.success(ticket?.isArchived ? "Ticket désarchivé" : "Ticket archivé");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de mettre à jour l'archivage")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/tickets/${id}`),
    onSuccess: () => {
      toast.success("Ticket supprimé");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate("/tickets");
    },
    onError: (err) => {
      setConfirmDelete(false);
      toast.error(apiErrorMessage(err, "Impossible de supprimer le ticket"));
    },
  });

  function handleComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) return;
    commentMutation.mutate();
  }

  if (isLoading || !ticket) {
    return <PageSpinner label="Chargement du ticket…" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/tickets" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        ← Retour aux tickets
      </Link>

      <Card className="mb-4 p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">{ticket.reference}</span>
          <div className="flex items-center gap-2">
            {ticket.isArchived && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                Archivé
              </span>
            )}
            {ticket.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                <IconAlertTriangle className="h-3.5 w-3.5" /> SLA dépassé
              </span>
            )}
          </div>
        </div>
        <h1 className="mb-3 text-xl font-bold text-slate-900">{ticket.title}</h1>
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {ticket.type.name}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {ticket.category.name}
            {ticket.subCategory ? ` · ${ticket.subCategory.name}` : ""}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Canal : {ticket.channel}
          </span>
        </div>
        <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
        <div className="grid grid-cols-2 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <div>Demandeur : <span className="text-slate-700">{ticket.requester.name}</span></div>
          <div>Assigné à : <span className="text-slate-700">{ticket.assignee?.name ?? "Non assigné"}</span></div>
          <div>
            Société : <span className="text-slate-700">{ticket.requester.company.name}</span>
          </div>
          <div>
            Service : <span className="text-slate-700">{ticket.requester.service?.name ?? "—"}</span>
          </div>
          <div>Créé le : <span className="text-slate-700">{new Date(ticket.createdAt).toLocaleString("fr-FR")}</span></div>
          <div>
            Échéance SLA :{" "}
            <span className={ticket.isOverdue ? "font-medium text-red-600" : "text-slate-700"}>
              {ticket.dueAt ? new Date(ticket.dueAt).toLocaleString("fr-FR") : "—"}
            </span>
          </div>
          <div>
            {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "Temps de traitement" : "Temps écoulé"} :{" "}
            <span className="font-medium text-slate-700">{formatDuration(ticket.elapsedHours)}</span>
            {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
              <span className="text-slate-400"> (toujours ouvert)</span>
            )}
          </div>
        </div>
      </Card>

      <TicketStatusTimeline entries={ticket.statusHistory ?? []} />

      <ProcessPanel ticket={ticket} isStaff={isStaff} isAdmin={user?.role === "ADMIN"} currentUserId={user?.id} />

      <AttachmentsPanel ticketId={ticket.id} attachments={ticket.attachments ?? []} />

      <SatisfactionPanel ticket={ticket} isRequester={ticket.requester.id === user?.id} />

      {isStaff && (
        <Card className="mb-4 p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Gestion du ticket</h2>
          {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Statut</label>
              <select
                value={ticket.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Assigné à</label>
              <select
                value={ticket.assignee?.id ?? ""}
                onChange={(e) => updateMutation.mutate({ assigneeId: e.target.value || null })}
                className={selectClass}
              >
                <option value="">Non assigné</option>
                {agents?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <Button size="sm" variant="secondary" loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>
              {ticket.isArchived ? "Désarchiver" : "Archiver"}
            </Button>
            {isAdmin && (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce ticket ?"
        description={`Le ticket ${ticket.reference} sera définitivement supprimé, avec ses commentaires, pièces jointes et son historique. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Historique &amp; commentaires</h2>
        <div className="mb-4 space-y-3">
          {ticket.comments?.length === 0 && <p className="text-sm text-slate-400">Aucun commentaire pour le moment</p>}
          {ticket.comments?.map((c) => (
            <div
              key={c.id}
              className={`animate-fade-in rounded-md border p-3 text-sm ${
                c.isInternal ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {c.author.name} {c.isInternal && <span className="text-amber-700">(note interne)</span>}
                </span>
                <span>{new Date(c.createdAt).toLocaleString("fr-FR")}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{c.message}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleComment} className="space-y-2">
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ajouter un commentaire…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex items-center justify-between">
            {isStaff ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                Note interne (non visible par le demandeur)
              </label>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" loading={commentMutation.isPending}>
              Envoyer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
