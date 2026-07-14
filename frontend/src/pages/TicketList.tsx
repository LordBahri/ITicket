import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import type { Category, Priority, Ticket, TicketStatus } from "../types";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"];

export function TicketList() {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [search, setSearch] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", { status, categoryId, priorityId, search }],
    queryFn: async () =>
      (
        await apiClient.get<{ tickets: Ticket[] }>("/tickets", {
          params: {
            status: status || undefined,
            categoryId: categoryId || undefined,
            priorityId: priorityId || undefined,
            search: search || undefined,
          },
        })
      ).data.tickets,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tickets</h1>
        <Link
          to="/tickets/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nouveau ticket
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (titre, référence)…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Toutes les catégories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={priorityId} onChange={(e) => setPriorityId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Toutes les priorités</option>
          {priorities?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Référence</th>
              <th className="px-4 py-2">Titre</th>
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Priorité</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Assigné à</th>
              <th className="px-4 py-2">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && tickets?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Aucun ticket trouvé
                </td>
              </tr>
            )}
            {tickets?.map((ticket) => (
              <tr key={ticket.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/tickets/${ticket.id}`} className="font-medium text-slate-900 hover:underline">
                    {ticket.reference}
                  </Link>
                  {ticket.isOverdue && <span className="ml-2 text-xs font-medium text-red-600">En retard</span>}
                </td>
                <td className="px-4 py-2">{ticket.title}</td>
                <td className="px-4 py-2 text-slate-500">{ticket.category.name}</td>
                <td className="px-4 py-2">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">{ticket.assignee?.name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{new Date(ticket.createdAt).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
