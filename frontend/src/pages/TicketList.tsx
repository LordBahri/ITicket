import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { IconTicket } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import type { Category, Company, Priority, Ticket, TicketStatus, TicketType } from "../types";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"];
const PAGE_SIZE = 15;

type SortKey = "reference" | "priority" | "status" | "createdAt";

const inputClass = "rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="cursor-pointer select-none px-4 py-2 hover:text-slate-700"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? "text-brand-600" : "text-slate-300"}`}>
          {active && direction === "asc" ? "▲" : "▼"}
        </span>
      </span>
    </th>
  );
}

export function TicketList() {
  const { user } = useAuth();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  const [status, setStatus] = useState("");
  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const { data: ticketTypes } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => (await apiClient.get<{ ticketTypes: TicketType[] }>("/ticket-types")).data.ticketTypes,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
    enabled: isStaff,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", { status, typeId, categoryId, priorityId, companyId, search }],
    queryFn: async () =>
      (
        await apiClient.get<{ tickets: Ticket[] }>("/tickets", {
          params: {
            status: status || undefined,
            typeId: typeId || undefined,
            categoryId: categoryId || undefined,
            priorityId: priorityId || undefined,
            companyId: companyId || undefined,
            search: search || undefined,
          },
        })
      ).data.tickets,
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    if (!tickets) return [];
    const copy = [...tickets];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "reference") cmp = a.reference.localeCompare(b.reference);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "priority") cmp = a.priority.level - b.priority.level;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [tickets, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tickets</h1>
        <Link to="/tickets/new">
          <Button>+ Nouveau ticket</Button>
        </Link>
      </div>

      <Card className="mb-4 flex flex-wrap gap-3 p-4">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher (titre, référence)…"
          className={inputClass}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={typeId}
          onChange={(e) => {
            setTypeId(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Tous les types</option>
          {ticketTypes?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Toutes les catégories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={priorityId}
          onChange={(e) => {
            setPriorityId(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Toutes les priorités</option>
          {priorities?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {isStaff && (
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">Toutes les sociétés</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <SortHeader label="Référence" sortKey="reference" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
              <th className="px-4 py-2">Titre</th>
              {isStaff && <th className="px-4 py-2">Société</th>}
              <th className="px-4 py-2">Catégorie</th>
              <SortHeader label="Priorité" sortKey="priority" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
              <SortHeader label="Statut" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
              <th className="px-4 py-2">Assigné à</th>
              <SortHeader label="Créé le" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={isStaff ? 8 : 7} />)}

            {!isLoading && pageItems.length === 0 && (
              <tr>
                <td colSpan={isStaff ? 8 : 7}>
                  <EmptyState
                    icon={IconTicket}
                    title="Aucun ticket trouvé"
                    description="Essayez d'ajuster vos filtres ou créez un nouveau ticket."
                  />
                </td>
              </tr>
            )}

            {pageItems.map((ticket) => (
              <tr key={ticket.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/tickets/${ticket.id}`} className="font-medium text-brand-700 hover:underline">
                    {ticket.reference}
                  </Link>
                  {ticket.isOverdue && <span className="ml-2 text-xs font-medium text-red-600">En retard</span>}
                </td>
                <td className="px-4 py-2">{ticket.title}</td>
                {isStaff && <td className="px-4 py-2 text-slate-500">{ticket.requester.company.name}</td>}
                <td className="px-4 py-2 text-slate-500">
                  <div>{ticket.category.name}</div>
                  <div className="text-xs text-slate-400">
                    {ticket.type.name}
                    {ticket.subCategory ? ` · ${ticket.subCategory.name}` : ""}
                  </div>
                </td>
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

        {!isLoading && sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>
              {sorted.length} ticket{sorted.length > 1 ? "s" : ""} · page {currentPage}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Précédent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant →
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
