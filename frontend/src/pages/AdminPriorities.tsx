import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Priority } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminPriorities() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [responseTimeHours, setResponseTimeHours] = useState(8);
  const [resolutionTimeHours, setResolutionTimeHours] = useState(48);
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState<string | null>(null);

  const { data: priorities, isLoading } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => (await apiClient.get<{ priorities: Priority[] }>("/priorities")).data.priorities,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/priorities", { name, responseTimeHours, resolutionTimeHours, color }),
    onSuccess: () => {
      setName("");
      setShowForm(false);
      toast.success("Priorité créée");
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer la priorité");
      setError(msg);
      toast.error(msg);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Priorités &amp; SLA</h1>
        <Button onClick={() => setShowForm(true)}>+ Nouvelle priorité</Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle priorité">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom (ex : Haute)"
              className={inputClass}
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-slate-300"
            />
            <div>
              <label className="mb-1 block text-xs text-slate-500">Délai de première réponse (heures)</label>
              <input
                type="number"
                min={1}
                required
                value={responseTimeHours}
                onChange={(e) => setResponseTimeHours(Number(e.target.value))}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Délai de résolution (heures)</label>
              <input
                type="number"
                min={1}
                required
                value={resolutionTimeHours}
                onChange={(e) => setResolutionTimeHours(Number(e.target.value))}
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={createMutation.isPending}>
              Ajouter
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Réponse (h)</th>
              <th className="px-4 py-2">Résolution (h)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}
            {priorities?.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${p.color}20`, color: p.color }}
                  >
                    {p.name}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{p.responseTimeHours}</td>
                <td className="px-4 py-2 text-slate-600">{p.resolutionTimeHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
