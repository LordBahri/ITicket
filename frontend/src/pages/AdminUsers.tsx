import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { IconTrash } from "../components/icons";
import type { Company, Role, Service, User } from "../types";

const ROLES: Role[] = ["USER", "AGENT", "ADMIN"];
const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminUsers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [companyId, setCompanyId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [matricule, setMatricule] = useState("");
  const [phone, setPhone] = useState("");
  const [pcName, setPcName] = useState("");
  const [anydeskId, setAnydeskId] = useState("");
  const [teamviewerId, setTeamviewerId] = useState("");
  const [ultraviewerId, setUltraviewerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<{ email: string; password: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get<{ users: User[] }>("/users")).data.users,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const selectedCompany = companies?.find((c) => c.id === companyId);
  const availableServices: Service[] = selectedCompany?.services ?? [];

  function resetForm() {
    setName("");
    setEmail("");
    setRole("USER");
    setCompanyId("");
    setServiceId("");
    setMatricule("");
    setPhone("");
    setPcName("");
    setAnydeskId("");
    setTeamviewerId("");
    setUltraviewerId("");
    setShowDetails(false);
    setShowForm(false);
  }

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post<{ user: User; generatedPassword: string }>("/users", {
        name,
        email,
        role,
        companyId,
        serviceId: serviceId || null,
        matricule: matricule || null,
        phone: phone || null,
        pcName: pcName || null,
        anydeskId: anydeskId || null,
        teamviewerId: teamviewerId || null,
        ultraviewerId: ultraviewerId || null,
      }),
    onSuccess: (res) => {
      setGeneratedPassword({ email: res.data.user.email, password: res.data.generatedPassword });
      resetForm();
      toast.success("Utilisateur créé");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de créer l'utilisateur");
      setError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "Impossible de supprimer l'utilisateur"));
      setUserToDelete(null);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  function copyPassword() {
    if (!generatedPassword) return;
    navigator.clipboard?.writeText(generatedPassword.password).then(
      () => toast.success("Mot de passe copié"),
      () => undefined
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Utilisateurs</h1>
        <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "+ Nouvel utilisateur"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 max-w-2xl p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className={inputClass} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={inputClass}
              />
              <select
                required
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setServiceId("");
                }}
                className={inputClass}
              >
                <option value="">Société…</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={!companyId}
                className={inputClass}
              >
                <option value="">Service…</option>
                {availableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              {showDetails ? "− Masquer les détails supplémentaires" : "+ Détails supplémentaires (matricule, téléphone, accès distant…)"}
            </button>

            {showDetails && (
              <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                <input value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="Matricule" className={inputClass} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" className={inputClass} />
                <input value={pcName} onChange={(e) => setPcName(e.target.value)} placeholder="Nom du poste (PC)" className={inputClass} />
                <input value={anydeskId} onChange={(e) => setAnydeskId(e.target.value)} placeholder="ID AnyDesk" className={inputClass} />
                <input
                  value={teamviewerId}
                  onChange={(e) => setTeamviewerId(e.target.value)}
                  placeholder="ID TeamViewer"
                  className={inputClass}
                />
                <input
                  value={ultraviewerId}
                  onChange={(e) => setUltraviewerId(e.target.value)}
                  placeholder="ID UltraViewer"
                  className={inputClass}
                />
              </div>
            )}

            <p className="text-xs text-slate-400">
              Un mot de passe temporaire sera généré automatiquement et envoyé par email à l'utilisateur. Il pourra le
              modifier depuis « Mon compte ».
            </p>
            <Button type="submit" loading={createMutation.isPending}>
              Créer le compte
            </Button>
          </form>
        </Card>
      )}

      {generatedPassword && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 text-sm font-medium text-emerald-800">
            Compte créé pour {generatedPassword.email}. Mot de passe temporaire généré :
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700">
              {generatedPassword.password}
            </code>
            <Button size="sm" variant="secondary" onClick={copyPassword}>
              Copier
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setGeneratedPassword(null)}>
              Fermer
            </Button>
          </div>
          <p className="mt-2 text-xs text-emerald-700">Un email avec ces identifiants a également été envoyé à l'utilisateur.</p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Société</th>
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2">Rôle</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">
                  <Link to={`/admin/users/${u.id}`} className="text-brand-700 hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2 text-slate-500">{u.company.name}</td>
                <td className="px-4 py-2 text-slate-500">{u.service?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">{u.role}</span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      u.isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {u.isActive ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setUserToDelete(u)}
                    title="Supprimer"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Supprimer cet utilisateur ?"
        description={
          userToDelete
            ? `${userToDelete.name} (${userToDelete.email}) sera définitivement supprimé. Si des tickets ou du matériel lui sont liés, désactivez plutôt son compte.`
            : undefined
        }
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
