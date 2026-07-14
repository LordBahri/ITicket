import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { TicketType } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminTicketTypes() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: ticketTypes, isLoading } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => (await apiClient.get<{ ticketTypes: TicketType[] }>("/ticket-types")).data.ticketTypes,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/ticket-types", { name, description: description || undefined }),
    onSuccess: () => {
      setName("");
      setDescription("");
      toast.success("Type de demande créé");
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer le type de demande");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (ticketType: TicketType) =>
      apiClient.patch(`/ticket-types/${ticketType.id}`, { isActive: !ticketType.isActive }),
    onSuccess: (_res, ticketType) => {
      toast.success(ticketType.isActive ? "Type désactivé" : "Type activé");
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
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
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Types de demande</h1>
      <p className="mb-6 text-sm text-slate-500">
        Classification de premier niveau des tickets (Incident, Demande de service, Problème, Changement…).
      </p>

      <Card className="mb-6 p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom (ex : Incident)"
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
            {ticketTypes?.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{t.name}</td>
                <td className="px-4 py-2 text-slate-500">{t.description ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      t.isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {t.isActive ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggleMutation.mutate(t)}
                    className="text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                  >
                    {t.isActive ? "Désactiver" : "Activer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
