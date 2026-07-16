import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { IconLock } from "../components/icons";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Account() {
  const { user } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => apiClient.patch("/auth/password", { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Mot de passe modifié");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de modifier le mot de passe");
      setError(msg);
      toast.error(msg);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Mon compte</h1>

      <Card className="mb-6 p-5">
        <p className="text-sm text-slate-500">
          Nom : <span className="font-medium text-slate-700">{user?.name}</span>
        </p>
        <p className="text-sm text-slate-500">
          Email : <span className="font-medium text-slate-700">{user?.email}</span>
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <IconLock className="h-4 w-4 text-slate-400" /> Modifier mon mot de passe
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Mot de passe actuel</label>
            <input
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Nouveau mot de passe</label>
            <input
              required
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Confirmer le nouveau mot de passe</label>
            <input
              required
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button type="submit" loading={mutation.isPending}>
            Enregistrer
          </Button>
        </form>
      </Card>
    </div>
  );
}
