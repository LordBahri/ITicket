import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import type { Category, Priority, SubCategory, TicketType } from "../types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface CategoryDetailData extends Category {
  ticketType: TicketType;
  subCategories: (SubCategory & { priority: Priority })[];
  _count: { tickets: number };
}

export function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: category, isLoading } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => (await apiClient.get<{ category: CategoryDetailData }>(`/categories/${id}`)).data.category,
    enabled: Boolean(id),
  });

  const { data: ticketTypes } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => (await apiClient.get<{ ticketTypes: TicketType[] }>("/ticket-types")).data.ticketTypes,
  });

  const updateMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/categories/${id}`, { name, description: description || null, ticketTypeId }),
    onSuccess: () => {
      toast.success("Catégorie mise à jour");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["category", id] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour la catégorie");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/categories/${id}`, { isActive: !category!.isActive }),
    onSuccess: () => {
      toast.success(category?.isActive ? "Catégorie désactivée" : "Catégorie activée");
      queryClient.invalidateQueries({ queryKey: ["category", id] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function startEdit() {
    if (!category) return;
    setName(category.name);
    setDescription(category.description ?? "");
    setTicketTypeId(category.ticketTypeId);
    setError(null);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  }

  if (isLoading || !category) {
    return <PageSpinner label="Chargement de la fiche…" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/categories")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Retour aux catégories
      </button>

      <Card className="mb-4 p-6">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Type de demande</label>
              <select required value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)} className={inputClass}>
                {ticketTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nom</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={updateMutation.isPending}>
                Enregistrer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{category.name}</h1>
                <Link to={`/admin/ticket-types/${category.ticketType.id}`} className="text-sm text-brand-700 hover:underline">
                  {category.ticketType.name}
                </Link>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  category.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${category.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                {category.isActive ? "Active" : "Désactivée"}
              </span>
            </div>
            {category.description && <p className="mb-4 text-sm text-slate-500">{category.description}</p>}
            <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">
              Tickets créés sous cette catégorie : <span className="text-slate-700">{category._count.tickets}</span>
            </div>
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" onClick={startEdit}>
                Modifier
              </Button>
              <Button size="sm" variant="secondary" loading={toggleActiveMutation.isPending} onClick={() => toggleActiveMutation.mutate()}>
                {category.isActive ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Sous-catégories</h2>
        {category.subCategories.length === 0 && <p className="text-sm text-slate-400">Aucune sous-catégorie</p>}
        <ul className="space-y-1.5">
          {category.subCategories.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <Link to={`/admin/subcategories/${s.id}`} className="text-brand-700 hover:underline">
                {s.name}
              </Link>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: s.priority.color, backgroundColor: `${s.priority.color}1a` }}>
                {s.priority.name}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
