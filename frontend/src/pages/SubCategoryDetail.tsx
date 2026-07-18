import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import type { Category, Priority, SubCategory } from "../types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface SubCategoryDetailData extends SubCategory {
  category: Category & { ticketTypeId: string };
  priority: Priority;
  _count: { tickets: number };
}

export function SubCategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: subCategory, isLoading } = useQuery({
    queryKey: ["subcategory", id],
    queryFn: async () => (await apiClient.get<{ subCategory: SubCategoryDetailData }>(`/subcategories/${id}`)).data.subCategory,
    enabled: Boolean(id),
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const updateMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/subcategories/${id}`, { name, description: description || null, priorityId }),
    onSuccess: () => {
      toast.success("Sous-catégorie mise à jour");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["subcategory", id] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour la sous-catégorie");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/subcategories/${id}`, { isActive: !subCategory!.isActive }),
    onSuccess: () => {
      toast.success(subCategory?.isActive ? "Sous-catégorie désactivée" : "Sous-catégorie activée");
      queryClient.invalidateQueries({ queryKey: ["subcategory", id] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function startEdit() {
    if (!subCategory) return;
    setName(subCategory.name);
    setDescription(subCategory.description ?? "");
    setPriorityId(subCategory.priorityId);
    setError(null);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  }

  if (isLoading || !subCategory) {
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

      <Card className="p-6">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nom</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Priorité (SLA appliqué automatiquement aux tickets)</label>
              <select required value={priorityId} onChange={(e) => setPriorityId(e.target.value)} className={inputClass}>
                {priorities?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
                <h1 className="text-xl font-bold text-slate-900">{subCategory.name}</h1>
                <Link to={`/admin/categories/${subCategory.category.id}`} className="text-sm text-brand-700 hover:underline">
                  {subCategory.category.name}
                </Link>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  subCategory.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${subCategory.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                {subCategory.isActive ? "Active" : "Désactivée"}
              </span>
            </div>
            {subCategory.description && <p className="mb-4 text-sm text-slate-500">{subCategory.description}</p>}
            <div className="grid grid-cols-2 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <div>
                Priorité automatique :{" "}
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ color: subCategory.priority.color, backgroundColor: `${subCategory.priority.color}1a` }}
                >
                  {subCategory.priority.name}
                </span>
              </div>
              <div>
                Tickets créés : <span className="text-slate-700">{subCategory._count.tickets}</span>
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" onClick={startEdit}>
                Modifier
              </Button>
              <Button size="sm" variant="secondary" loading={toggleActiveMutation.isPending} onClick={() => toggleActiveMutation.mutate()}>
                {subCategory.isActive ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
