import { useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import type { Ticket, User, TicketStatus } from "../types";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"];

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
    mutationFn: async () =>
      apiClient.post(`/tickets/${id}/comments`, { message, isInternal }),
    onSuccess: () => {
      setMessage("");
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible d'ajouter le commentaire")),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<{ status: TicketStatus; assigneeId: string | null }>) =>
      apiClient.patch(`/tickets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible de mettre à jour le ticket")),
  });

  function handleComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) return;
    commentMutation.mutate();
  }

  if (isLoading || !ticket) {
    return <div className="text-slate-500">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/tickets" className="mb-4 inline-block text-sm text-slate-500 hover:underline">
        ← Retour aux tickets
      </Link>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">{ticket.reference}</span>
          {ticket.isOverdue && <span className="text-xs font-semibold text-red-600">SLA dépassé</span>}
        </div>
        <h1 className="mb-3 text-xl font-bold text-slate-900">{ticket.title}</h1>
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {ticket.category.name}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Canal : {ticket.channel}
          </span>
        </div>
        <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
          <div>Demandeur : {ticket.requester.name}</div>
          <div>Assigné à : {ticket.assignee?.name ?? "Non assigné"}</div>
          <div>Créé le : {new Date(ticket.createdAt).toLocaleString("fr-FR")}</div>
          <div>Échéance SLA : {ticket.dueAt ? new Date(ticket.dueAt).toLocaleString("fr-FR") : "—"}</div>
        </div>
      </div>

      {isStaff && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Gestion du ticket</h2>
          {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Statut</label>
              <select
                value={ticket.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Historique &amp; commentaires</h2>
        <div className="mb-4 space-y-3">
          {ticket.comments?.length === 0 && <p className="text-sm text-slate-400">Aucun commentaire pour le moment</p>}
          {ticket.comments?.map((c) => (
            <div
              key={c.id}
              className={`rounded-md border p-3 text-sm ${
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            <button
              type="submit"
              disabled={commentMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
