import { Fragment, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Category, SubCategory } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function SubCategoryManager({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: subCategories, isLoading } = useQuery({
    queryKey: ["subcategories", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ subCategories: SubCategory[] }>("/subcategories", { params: { categoryId } })
      ).data.subCategories,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/subcategories", { name, categoryId }),
    onSuccess: () => {
      setName("");
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
    if (!name.trim()) return;
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
            <button
              onClick={() => toggleMutation.mutate(s)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                s.isActive
                  ? "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-600"
                  : "border-slate-200 bg-slate-100 text-slate-400 hover:text-emerald-600"
              }`}
              title={s.isActive ? "Cliquer pour désactiver" : "Cliquer pour activer"}
            >
              {s.name}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouvelle sous-catégorie…"
          className={`flex-1 ${inputClass} py-1.5 text-xs`}
        />
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/categories", { name, description: description || undefined }),
    onSuccess: () => {
      setName("");
      setDescription("");
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
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Catégories &amp; sous-catégories</h1>
      <p className="mb-6 text-sm text-slate-500">Cliquez sur une catégorie pour gérer ses sous-catégories.</p>

      <Card className="mb-6 max-w-2xl p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom (ex : Matériel)"
              className={`flex-1 ${inputClass}`}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Ajouter
            </Button>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            className={`w-full ${inputClass}`}
          />
        </form>
      </Card>

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
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}
            {categories?.map((c) => (
              <Fragment key={c.id}>
                <tr
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <span className={`mr-1 inline-block transition-transform ${expanded === c.id ? "rotate-90" : ""}`}>
                      ›
                    </span>
                    {c.name}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate(c);
                      }}
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
  );
}
