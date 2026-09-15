import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { SageDatabase } from "../types";

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminSageDatabases() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SageDatabase | null>(null);

  const { data: sageDatabases, isLoading } = useQuery({
    queryKey: ["sage-databases"],
    queryFn: async () => (await apiClient.get<{ sageDatabases: SageDatabase[] }>("/sage-databases")).data.sageDatabases,
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/sage-databases", { name }),
    onSuccess: () => {
      setName("");
      setShowForm(false);
      toast.success("Base Sage créée");
      queryClient.invalidateQueries({ queryKey: ["sage-databases"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer la base Sage");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (db: SageDatabase) => apiClient.patch(`/sage-databases/${db.id}`, { isActive: !db.isActive }),
    onSuccess: (_res, db) => {
      toast.success(db.isActive ? "Base désactivée" : "Base activée");
      queryClient.invalidateQueries({ queryKey: ["sage-databases"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (db: SageDatabase) => apiClient.delete(`/sage-databases/${db.id}`),
    onSuccess: () => {
      toast.success("Base Sage supprimée");
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["sage-databases"] });
    },
    onError: (err) => {
      setConfirmDelete(null);
      toast.error(apiErrorMessage(err, "Impossible de supprimer cette base"));
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
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-900">Bases Sage</h1>
          <p className="text-sm text-slate-500">
            Catalogue des bases Sage 100 (une par société/filiale en général), géré indépendamment des sociétés
            ITicket. Utilisé pour cocher les accès à affecter lors d'une demande d'accès Sage.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nouvelle base</Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle base Sage">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la base (ex : Holding, Filiale A…)"
            className={`w-full ${inputClass}`}
          />
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
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}
            {sageDatabases?.map((db) => (
              <tr key={db.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{db.name}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      db.isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${db.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {db.isActive ? "Active" : "Désactivée"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggleMutation.mutate(db)}
                    className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-700 hover:underline"
                  >
                    {db.isActive ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(db)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Supprimer cette base Sage ?"
        description={`La base « ${confirmDelete?.name} » sera définitivement supprimée. Impossible si elle est encore affectée à un utilisateur.`}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
