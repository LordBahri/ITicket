import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import type { Priority } from "../types";

export function AdminPriorities() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [responseTimeHours, setResponseTimeHours] = useState(8);
  const [resolutionTimeHours, setResolutionTimeHours] = useState(48);
  const [color, setColor] = useState("#6b7280");
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
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Impossible de créer la priorité")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Priorités &amp; SLA</h1>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex : Haute)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-300"
          />
          <div>
            <label className="mb-1 block text-xs text-slate-500">Délai de première réponse (heures)</label>
            <input
              type="number"
              min={1}
              required
              value={responseTimeHours}
              onChange={(e) => setResponseTimeHours(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Réponse (h)</th>
              <th className="px-4 py-2">Résolution (h)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            )}
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
      </div>
    </div>
  );
}
