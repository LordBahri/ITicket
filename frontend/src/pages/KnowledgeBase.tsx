import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Category, KnowledgeArticle } from "../types";

export function KnowledgeBase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ["knowledge", { search, categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ articles: KnowledgeArticle[] }>("/knowledge", {
          params: { search: search || undefined, categoryId: categoryId || undefined },
        })
      ).data.articles,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/knowledge", {
        title,
        content,
        categoryId: formCategoryId || null,
      }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      setFormCategoryId("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible de créer l'article")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Base de connaissances</h1>
        {isStaff && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showForm ? "Annuler" : "+ Nouvel article"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'article"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={formCategoryId}
            onChange={(e) => setFormCategoryId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Catégorie (optionnel)</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <textarea
            required
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenu de l'article…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Publier
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un article…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Toutes les catégories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-slate-400">Chargement…</p>}
        {!isLoading && articles?.length === 0 && <p className="text-slate-400">Aucun article trouvé</p>}
        {articles?.map((a) => (
          <Link
            key={a.id}
            to={`/knowledge/${a.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-medium text-slate-900">{a.title}</h2>
              {!a.isPublished && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Brouillon
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-slate-500">{a.content}</p>
            {a.category && <span className="mt-2 inline-block text-xs text-slate-400">{a.category.name}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
