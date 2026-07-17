import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { IconLock, IconIdCard } from "../components/icons";
import type { User } from "../types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Account() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return apiClient.post<{ user: User }>("/auth/avatar", formData);
    },
    onSuccess: (res) => {
      setUser(res.data.user);
      toast.success("Photo de profil mise à jour");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de mettre à jour la photo")),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => apiClient.delete<{ user: User }>("/auth/avatar"),
    onSuccess: (res) => {
      setUser(res.data.user);
      toast.success("Photo de profil supprimée");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de supprimer la photo")),
  });

  const profileMutation = useMutation({
    mutationFn: async () => apiClient.patch<{ user: User }>("/auth/profile", { name, phone: phone || null }),
    onSuccess: (res) => {
      setUser(res.data.user);
      toast.success("Profil mis à jour");
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour le profil");
      setProfileError(msg);
      toast.error(msg);
    },
  });

  const passwordMutation = useMutation({
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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    e.target.value = "";
  }

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    profileMutation.mutate();
  }

  function handlePasswordSubmit(e: FormEvent) {
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
    passwordMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Mon compte</h1>

      <Card className="mb-6 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="lg" />
          <div>
            <p className="text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="mb-2 text-sm text-slate-500">{user?.email}</p>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                size="sm"
                variant="secondary"
                loading={avatarMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                Changer la photo
              </Button>
              {user?.avatarUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={removeAvatarMutation.isPending}
                  onClick={() => removeAvatarMutation.mutate()}
                >
                  Retirer
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <IconIdCard className="h-4 w-4 text-slate-400" /> Informations personnelles
        </h2>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          {profileError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nom complet</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            L'email et les autres informations administratives (société, service, matricule…) sont gérés par un
            administrateur IT.
          </p>
          <Button type="submit" loading={profileMutation.isPending}>
            Enregistrer
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <IconLock className="h-4 w-4 text-slate-400" /> Modifier mon mot de passe
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
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
          <Button type="submit" loading={passwordMutation.isPending}>
            Enregistrer
          </Button>
        </form>
      </Card>
    </div>
  );
}
