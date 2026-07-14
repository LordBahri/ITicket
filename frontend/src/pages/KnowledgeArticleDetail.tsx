import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { KnowledgeArticle } from "../types";

export function KnowledgeArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: article, isLoading } = useQuery({
    queryKey: ["knowledge", id],
    queryFn: async () => (await apiClient.get<{ article: KnowledgeArticle }>(`/knowledge/${id}`)).data.article,
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<{ title: string; content: string; isPublished: boolean }>) =>
      apiClient.patch(`/knowledge/${id}`, data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["knowledge", id] });
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible de mettre à jour l'article")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/knowledge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      navigate("/knowledge");
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible de supprimer l'article")),
  });

  function startEdit() {
    if (!article) return;
    setTitle(article.title);
    setContent(article.content);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateMutation.mutate({ title, content });
  }

  if (isLoading || !article) {
    return <div className="text-slate-500">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/knowledge" className="mb-4 inline-block text-sm text-slate-500 hover:underline">
        ← Retour à la base de connaissances
      </Link>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-6">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {article.category && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {article.category.name}
                </span>
              )}
              {!article.isPublished && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Brouillon
                </span>
              )}
            </div>
            {isStaff && (
              <div className="flex gap-3 text-sm">
                <button onClick={startEdit} className="text-slate-500 hover:underline">
                  Modifier
                </button>
                <button
                  onClick={() => updateMutation.mutate({ isPublished: !article.isPublished })}
                  className="text-slate-500 hover:underline"
                >
                  {article.isPublished ? "Dépublier" : "Publier"}
                </button>
                <button
                  onClick={() => confirm("Supprimer cet article ?") && deleteMutation.mutate()}
                  className="text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
          <h1 className="mb-4 text-xl font-bold text-slate-900">{article.title}</h1>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{article.content}</p>
          <p className="mt-6 text-xs text-slate-400">
            Par {article.author.name} · Mis à jour le {new Date(article.updatedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      )}
    </div>
  );
}
