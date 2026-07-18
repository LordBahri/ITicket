import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import type { Priority, SubCategory, TicketType } from "../types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface CategoryWithSubs {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  subCategories: (SubCategory & { priority: Priority })[];
  _count: { tickets: number };
}

interface TicketTypeDetailData extends TicketType {
  categories: CategoryWithSubs[];
  processes: { id: string; name: string; isActive: boolean }[];
  _count: { tickets: number };
}

export function TicketTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: ticketType, isLoading } = useQuery({
    queryKey: ["ticket-type", id],
    queryFn: async () => (await apiClient.get<{ ticketType: TicketTypeDetailData }>(`/ticket-types/${id}`)).data.ticketType,
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/ticket-types/${id}`, { name, description: description || null }),
    onSuccess: () => {
      toast.success("Type de demande mis à jour");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["ticket-type", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour le type de demande");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/ticket-types/${id}`, { isActive: !ticketType!.isActive }),
    onSuccess: () => {
      toast.success(ticketType?.isActive ? "Type désactivé" : "Type activé");
      queryClient.invalidateQueries({ queryKey: ["ticket-type", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  function startEdit() {
    if (!ticketType) return;
    setName(ticketType.name);
    setDescription(ticketType.description ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  }

  if (isLoading || !ticketType) {
    return <PageSpinner label="Chargement de la fiche…" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/ticket-types")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Retour aux types de demande
      </button>

      <Card className="mb-4 p-6">
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
              <h1 className="text-xl font-bold text-slate-900">{ticketType.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  ticketType.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ticketType.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                {ticketType.isActive ? "Actif" : "Désactivé"}
              </span>
            </div>
            {ticketType.description && <p className="mb-4 text-sm text-slate-500">{ticketType.description}</p>}
            <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">
              Tickets créés sous ce type : <span className="text-slate-700">{ticketType._count.tickets}</span>
            </div>
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" onClick={startEdit}>
                Modifier
              </Button>
              <Button size="sm" variant="secondary" loading={toggleActiveMutation.isPending} onClick={() => toggleActiveMutation.mutate()}>
                {ticketType.isActive ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </>
        )}
      </Card>

      {ticketType.processes.length > 0 && (
        <Card className="mb-4 p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Processus IT réservés à ce type</h2>
          <p className="mb-3 text-xs text-slate-400">
            Ce type de demande n'est accessible que via la sélection d'un de ces processus, jamais en création de ticket
            libre.
          </p>
          <ul className="space-y-1.5">
            {ticketType.processes.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-brand-700">{p.name}</span>
                {!p.isActive && <span className="text-xs text-slate-400">(désactivé)</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Catégories de ce type</h2>
        {ticketType.categories.length === 0 && <p className="text-sm text-slate-400">Aucune catégorie sous ce type</p>}
        <ul className="space-y-3">
          {ticketType.categories.map((c) => (
            <li key={c.id}>
              <Link to={`/admin/categories/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                {c.name}
              </Link>
              {!c.isActive && <span className="ml-2 text-xs text-slate-400">(désactivée)</span>}
              <span className="ml-2 text-xs text-slate-400">{c._count.tickets} ticket(s)</span>
              {c.subCategories.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {c.subCategories.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/admin/subcategories/${s.id}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:border-brand-200 hover:text-brand-700"
                      >
                        {s.name} · {s.priority.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
