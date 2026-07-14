import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import type { KnowledgeArticle } from "../types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function KnowledgeArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["knowledge", id],
    queryFn: async () => (await apiClient.get<{ article: KnowledgeArticle }>(`/knowledge/${id}`)).data.article,
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<{ title: string; content: string; isPublished: boolean }>) =>
      apiClient.patch(`/knowledge/${id}`, data),
    onSuccess: (_res, variables) => {
      setEditing(false);
      if (variables.isPublished !== undefined) {
        toast.success(variables.isPublished ? "Article publié" : "Article dépublié");
      } else {
        toast.success("Article mis à jour");
      }
      queryClient.invalidateQueries({ queryKey: ["knowledge", id] });
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour l'article");
      setError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/knowledge/${id}`),
    onSuccess: () => {
      toast.success("Article supprimé");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      navigate("/knowledge");
    },
    onError: (err) => {
      setConfirmDelete(false);
      toast.error(apiErrorMessage(err, "Impossible de supprimer l'article"));
    },
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
    return <PageSpinner label="Chargement de l'article…" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/knowledge" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        ← Retour à la base de connaissances
      </Link>

      {error && (
        <div className="mb-4 animate-fade-in rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {editing ? (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            <textarea required rows={10} value={content} onChange={(e) => setContent(e.target.value)} className={inputClass} />
            <div className="flex gap-2">
              <Button type="submit" loading={updateMutation.isPending}>
                Enregistrer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-6">
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
                <button onClick={startEdit} className="text-slate-500 hover:text-slate-800 hover:underline">
                  Modifier
                </button>
                <button
                  onClick={() => updateMutation.mutate({ isPublished: !article.isPublished })}
                  className="text-slate-500 hover:text-slate-800 hover:underline"
                >
                  {article.isPublished ? "Dépublier" : "Publier"}
                </button>
                <button onClick={() => setConfirmDelete(true)} className="text-red-600 hover:underline">
                  Supprimer
                </button>
              </div>
            )}
          </div>
          <h1 className="mb-4 text-xl font-bold text-slate-900">{article.title}</h1>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{article.content}</p>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
            Par {article.author.name} · Mis à jour le {new Date(article.updatedAt).toLocaleDateString("fr-FR")}
          </p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cet article ?"
        description="Cette action est définitive et ne peut pas être annulée."
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
