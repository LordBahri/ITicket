import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { IconBook, IconPlus } from "../components/icons";
import type { Category, KnowledgeArticle } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>~]/g, "")
    .replace(/^\s*[-\d.]+\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

export function KnowledgeBase() {
  const { user } = useAuth();
  const toast = useToast();
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
      toast.success("Article publié");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer l'article");
      setError(msg);
      toast.error(msg);
    },
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
          <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Annuler" : "+ Nouvel article"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'article"
              className={`w-full ${inputClass}`}
            />
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              className={`w-full ${inputClass}`}
            >
              <option value="">Catégorie (optionnel)</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Format Markdown pris en charge (titres <code>##</code>, listes <code>-</code>/<code>1.</code>, images{" "}
              <code>![alt](url)</code>, liens, gras <code>**texte**</code>).
            </p>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenu de l'article…"
              className={`w-full ${inputClass}`}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Publier
            </Button>
          </form>
        </Card>
      )}

      <Card className="mb-4 flex flex-wrap gap-3 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un article…"
          className={inputClass}
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          <option value="">Toutes les catégories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Card>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}

        {!isLoading && articles?.length === 0 && (
          <Card>
            <EmptyState icon={IconBook} title="Aucun article trouvé" description="Essayez une autre recherche ou catégorie." />
          </Card>
        )}

        {articles?.map((a) => (
          <Link key={a.id} to={`/knowledge/${a.id}`}>
            <Card className="p-4 transition hover:border-brand-300 hover:shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-medium text-slate-900">{a.title}</h2>
                {!a.isPublished && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Brouillon
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-sm text-slate-500">{stripMarkdown(a.content)}</p>
              {a.category && (
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {a.category.name}
                </span>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
