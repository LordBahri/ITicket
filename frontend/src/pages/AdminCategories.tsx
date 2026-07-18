import { Fragment, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Category, Priority, SubCategory, TicketType } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SubCategoryManager({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: subCategories, isLoading } = useQuery({
    queryKey: ["subcategories", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ subCategories: SubCategory[] }>("/subcategories", { params: { categoryId } })
      ).data.subCategories,
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/subcategories", { name, categoryId, priorityId }),
    onSuccess: () => {
      setName("");
      setPriorityId("");
      toast.success("Sous-catégorie créée");
      queryClient.invalidateQueries({ queryKey: ["subcategories", { categoryId }] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer la sous-catégorie");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (subCategory: SubCategory) =>
      apiClient.patch(`/subcategories/${subCategory.id}`, { isActive: !subCategory.isActive }),
    onSuccess: () => {
      toast.success("Sous-catégorie mise à jour");
      queryClient.invalidateQueries({ queryKey: ["subcategories", { categoryId }] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !priorityId) return;
    createMutation.mutate();
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
      {error && <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</div>}
      {isLoading && <p className="text-xs text-slate-400">Chargement…</p>}
      {!isLoading && subCategories?.length === 0 && (
        <p className="mb-2 text-xs text-slate-400">Aucune sous-catégorie</p>
      )}
      <ul className="mb-2 flex flex-wrap gap-2">
        {subCategories?.map((s) => (
          <li key={s.id}>
            <Link
              to={`/admin/subcategories/${s.id}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                s.isActive
                  ? "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700"
                  : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
            >
              {s.name}
              {s.priority && <span className="text-slate-400">· {s.priority.name}</span>}
            </Link>
            <button
              onClick={() => toggleMutation.mutate(s)}
              title={s.isActive ? "Désactiver" : "Activer"}
              className="ml-1 text-xs text-slate-400 hover:text-red-600"
            >
              {s.isActive ? "✕" : "↺"}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouvelle sous-catégorie…"
          className={`flex-1 ${inputClass} py-1.5 text-xs`}
        />
        <select
          required
          value={priorityId}
          onChange={(e) => setPriorityId(e.target.value)}
          className={`${inputClass} py-1.5 text-xs`}
        >
          <option value="">Priorité…</option>
          {priorities?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" loading={createMutation.isPending}>
          Ajouter
        </Button>
      </form>
    </div>
  );
}

export function AdminCategories() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const { data: ticketTypes } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => (await apiClient.get<{ ticketTypes: TicketType[] }>("/ticket-types")).data.ticketTypes,
  });

  const grouped = useMemo(() => {
    const byType = new Map<string, { type: TicketType; categories: Category[] }>();
    for (const type of ticketTypes ?? []) {
      byType.set(type.id, { type, categories: [] });
    }
    for (const category of categories ?? []) {
      const group = byType.get(category.ticketTypeId);
      if (group) group.categories.push(category);
    }
    return Array.from(byType.values()).filter((g) => g.categories.length > 0 || true);
  }, [categories, ticketTypes]);

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/categories", { name, description: description || undefined, ticketTypeId }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setTicketTypeId("");
      setShowForm(false);
      toast.success("Catégorie créée");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer la catégorie");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (category: Category) =>
      apiClient.patch(`/categories/${category.id}`, { isActive: !category.isActive }),
    onSuccess: (_res, category) => {
      toast.success(category.isActive ? "Catégorie désactivée" : "Catégorie activée");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !ticketTypeId) return;
    createMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-900">Catégories &amp; sous-catégories</h1>
          <p className="text-sm text-slate-500">
            Classées par type de demande. Cliquez sur une catégorie pour gérer ses sous-catégories, ou sur son nom pour
            voir sa fiche complète.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nouvelle catégorie</Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle catégorie">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <select
            required
            value={ticketTypeId}
            onChange={(e) => setTicketTypeId(e.target.value)}
            className={`w-full ${inputClass}`}
          >
            <option value="">Type de demande…</option>
            {ticketTypes?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex : Matériel)"
            className={`w-full ${inputClass}`}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            className={`w-full ${inputClass}`}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={createMutation.isPending}>
              Ajouter
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      {isLoading && (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}
            </tbody>
          </table>
        </Card>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {grouped.map(({ type, categories: typeCategories }) => (
            <div key={type.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Link to={`/admin/ticket-types/${type.id}`} className="hover:text-brand-700 hover:underline">
                  {type.name}
                </Link>
                {!type.isActive && <span className="text-xs font-normal text-slate-400">(désactivé)</span>}
              </h2>
              <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Nom</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Statut</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {typeCategories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-400">
                          Aucune catégorie sous ce type
                        </td>
                      </tr>
                    )}
                    {typeCategories.map((c) => (
                      <Fragment key={c.id}>
                        <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">
                            <button
                              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                              className="mr-1 inline-block w-3 text-slate-400 transition-transform"
                              style={{ transform: expanded === c.id ? "rotate(90deg)" : undefined }}
                            >
                              ›
                            </button>
                            <Link to={`/admin/categories/${c.id}`} className="hover:text-brand-700 hover:underline">
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-slate-500">{c.description ?? "—"}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                c.isActive ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                              {c.isActive ? "Active" : "Désactivée"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => toggleMutation.mutate(c)}
                              className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                            >
                              {c.isActive ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                        {expanded === c.id && (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <SubCategoryManager categoryId={c.id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
