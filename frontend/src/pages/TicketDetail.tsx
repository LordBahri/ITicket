import { useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { IconAlertTriangle } from "../components/icons";
import type { Ticket, User, TicketStatus } from "../types";
import { AttachmentsPanel } from "../components/AttachmentsPanel";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"];

const selectClass =
  "rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {ticket.isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
              <IconAlertTriangle className="h-3.5 w-3.5" /> SLA dépassé
            </span>
          )}
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
        </div>
      </Card>

      <AttachmentsPanel ticketId={ticket.id} attachments={ticket.attachments ?? []} />

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
                    {s}
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
        </Card>
      )}

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
