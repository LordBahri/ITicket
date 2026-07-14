import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import type { Category, KnowledgeArticle, Priority, Ticket } from "../types";

export function NewTicket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>("/categories")).data.categories,
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const { data: suggestedArticles } = useQuery({
    queryKey: ["knowledge", { categoryId }],
    queryFn: async () =>
      (
        await apiClient.get<{ articles: KnowledgeArticle[] }>("/knowledge", { params: { categoryId } })
      ).data.articles,
    enabled: Boolean(categoryId),
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<{ ticket: Ticket }>("/tickets", {
          title,
          description,
          categoryId,
          priorityId,
        })
      ).data.ticket,
    onSuccess: async (ticket) => {
      if (files && files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append("files", file));
        try {
          await apiClient.post(`/tickets/${ticket.id}/attachments`, formData);
        } catch {
          // La pièce jointe peut être ré-ajoutée depuis la page du ticket si l'upload échoue
        }
      }
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible de créer le ticket")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Nouveau ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Mon PC ne démarre plus"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez le problème ou la demande en détail…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type d'intervention</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner…</option>
              {categories?.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
            <select
              required
              value={priorityId}
              onChange={(e) => setPriorityId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner…</option>
              {priorities?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {suggestedArticles && suggestedArticles.length > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 text-sm font-medium text-blue-900">
              Ces articles pourraient répondre à votre demande :
            </p>
            <ul className="space-y-1">
              {suggestedArticles.map((a) => (
                <li key={a.id}>
                  <Link to={`/knowledge/${a.id}`} target="_blank" className="text-sm text-blue-700 underline">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Pièces jointes (optionnel)</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Création…" : "Créer le ticket"}
        </button>
      </form>
    </div>
  );
}
