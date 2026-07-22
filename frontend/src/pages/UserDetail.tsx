import { useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PageSpinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import type { Asset, Company, Role, Service, Ticket, User } from "../types";

const ROLES: Role[] = ["USER", "AGENT", "ADMIN"];
const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function TicketMiniList({ title, tickets }: { title: string; tickets?: Ticket[] }) {
  return (
    <Card className="p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {!tickets && <p className="text-sm text-slate-400">Chargement…</p>}
      {tickets?.length === 0 && <p className="text-sm text-slate-400">Aucun ticket</p>}
      <ul className="space-y-1.5">
        {tickets?.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
            <Link to={`/tickets/${t.id}`} className="truncate text-brand-700 hover:underline">
              {t.reference} — {t.title}
            </Link>
            <StatusBadge status={t.status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AssetMiniList({ assets }: { assets?: Asset[] }) {
  return (
    <Card className="p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Matériel affecté</h2>
      {!assets && <p className="text-sm text-slate-400">Chargement…</p>}
      {assets?.length === 0 && <p className="text-sm text-slate-400">Aucun matériel affecté</p>}
      <ul className="space-y-1.5">
        {assets?.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">
              {a.name} <span className="text-xs text-slate-400">({a.assetType.name})</span>
            </span>
            {a.serialNumber && <span className="text-xs text-slate-400">{a.serialNumber}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [companyId, setCompanyId] = useState("");
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [matricule, setMatricule] = useState("");
  const [phone, setPhone] = useState("");
  const [pcName, setPcName] = useState("");
  const [anydeskId, setAnydeskId] = useState("");
  const [teamviewerId, setTeamviewerId] = useState("");
  const [ultraviewerId, setUltraviewerId] = useState("");
  const [adUsername, setAdUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => (await apiClient.get<{ user: User }>(`/users/${id}`)).data.user,
    enabled: Boolean(id),
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const { data: companyMates } = useQuery({
    queryKey: ["users", { companyId }],
    queryFn: async () => (await apiClient.get<{ users: User[] }>("/users", { params: { companyId } })).data.users,
    enabled: editing && Boolean(companyId),
  });

  const selectedCompany = companies?.find((c) => c.id === companyId);
  const availableServices: Service[] = selectedCompany?.services ?? [];
  const availableManagers = (companyMates ?? []).filter((m) => m.id !== id);

  const { data: requestedTickets } = useQuery({
    queryKey: ["tickets", { requesterId: id }],
    queryFn: async () => (await apiClient.get<{ tickets: Ticket[] }>("/tickets", { params: { requesterId: id } })).data.tickets,
    enabled: Boolean(id),
  });

  const { data: assignedTickets } = useQuery({
    queryKey: ["tickets", { assigneeId: id }],
    queryFn: async () => (await apiClient.get<{ tickets: Ticket[] }>("/tickets", { params: { assigneeId: id } })).data.tickets,
    enabled: Boolean(id) && (user?.role === "AGENT" || user?.role === "ADMIN"),
  });

  const { data: assignedAssets } = useQuery({
    queryKey: ["assets", { assigneeId: id }],
    queryFn: async () => (await apiClient.get<{ assets: Asset[] }>("/assets", { params: { assigneeId: id } })).data.assets,
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/users/${id}`, {
        name,
        email,
        role,
        companyId,
        serviceId: serviceId || null,
        managerId: managerId || null,
        isDepartmentHead,
        matricule: matricule || null,
        phone: phone || null,
        pcName: pcName || null,
        anydeskId: anydeskId || null,
        teamviewerId: teamviewerId || null,
        ultraviewerId: ultraviewerId || null,
        adUsername: adUsername || null,
      }),
    onSuccess: () => {
      toast.success("Utilisateur mis à jour");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible de mettre à jour l'utilisateur");
      setError(msg);
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/users/${id}`, { isActive: !user!.isActive }),
    onSuccess: () => {
      toast.success(user?.isActive ? "Utilisateur désactivé" : "Utilisateur activé");
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => apiClient.post<{ generatedPassword: string }>(`/users/${id}/reset-password`),
    onSuccess: (res) => {
      setResetPassword(res.data.generatedPassword);
      toast.success("Mot de passe réinitialisé");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de réinitialiser le mot de passe")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      navigate("/admin/users");
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "Impossible de supprimer l'utilisateur"));
      setConfirmDelete(false);
    },
  });

  function startEdit() {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setServiceId(user.service?.id ?? "");
    setManagerId(user.manager?.id ?? "");
    setRole(user.role);
    setCompanyId(user.company.id);
    setIsDepartmentHead(user.isDepartmentHead ?? false);
    setMatricule(user.matricule ?? "");
    setPhone(user.phone ?? "");
    setPcName(user.pcName ?? "");
    setAnydeskId(user.anydeskId ?? "");
    setTeamviewerId(user.teamviewerId ?? "");
    setUltraviewerId(user.ultraviewerId ?? "");
    setAdUsername(user.adUsername ?? "");
    setError(null);
    setResetPassword(null);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  }

  if (isLoading || !user) {
    return <PageSpinner label="Chargement de la fiche…" />;
  }

  const isStaff = user.role === "AGENT" || user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/admin/users")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Retour aux utilisateurs
      </button>

      <Card className="mb-4 p-6">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Nom complet</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Société</label>
                <select
                  required
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setServiceId("");
                    setManagerId("");
                  }}
                  className={inputClass}
                >
                  {companies
                    ?.filter((c) => !c.isSystemPlaceholder || c.id === companyId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Service</label>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Rôle</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Supérieur hiérarchique</label>
                <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputClass}>
                  <option value="">Aucun</option>
                  {availableManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Détails supplémentaires</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Matricule</label>
                  <input value={matricule} onChange={(e) => setMatricule(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Téléphone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Nom du poste (PC)</label>
                  <input value={pcName} onChange={(e) => setPcName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">ID AnyDesk</label>
                  <input value={anydeskId} onChange={(e) => setAnydeskId(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">ID TeamViewer</label>
                  <input value={teamviewerId} onChange={(e) => setTeamviewerId(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">ID UltraViewer</label>
                  <input value={ultraviewerId} onChange={(e) => setUltraviewerId(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Identifiant AD</label>
                  <input
                    value={adUsername}
                    onChange={(e) => setAdUsername(e.target.value)}
                    placeholder="ex : MENINX\jdupont"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isDepartmentHead}
                onChange={(e) => setIsDepartmentHead(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Responsable de service / directeur (peut lancer des demandes de processus IT)
            </label>
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
              <div>
                <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">{user.role}</span>
                {user.isDepartmentHead && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    Responsable de service
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {user.isActive ? "Actif" : "Désactivé"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <div>
                Société :{" "}
                <Link to={`/admin/companies/${user.company.id}`} className="text-brand-700 hover:underline">
                  {user.company.name}
                </Link>
              </div>
              <div>
                Service : <span className="text-slate-700">{user.service?.name ?? "—"}</span>
              </div>
              <div>
                Supérieur hiérarchique :{" "}
                {user.manager ? (
                  <Link to={`/admin/users/${user.manager.id}`} className="text-brand-700 hover:underline">
                    {user.manager.name}
                  </Link>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>
              {user.createdAt && (
                <div>
                  Créé le : <span className="text-slate-700">{new Date(user.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              )}
              {user.matricule && (
                <div>
                  Matricule : <span className="text-slate-700">{user.matricule}</span>
                </div>
              )}
              {user.phone && (
                <div>
                  Téléphone : <span className="text-slate-700">{user.phone}</span>
                </div>
              )}
              {user.pcName && (
                <div>
                  Poste (PC) : <span className="text-slate-700">{user.pcName}</span>
                </div>
              )}
              {user.adUsername && (
                <div>
                  Identifiant AD : <span className="text-slate-700">{user.adUsername}</span>
                </div>
              )}
              {(user.anydeskId || user.teamviewerId || user.ultraviewerId) && (
                <div className="col-span-2">
                  Accès à distance :{" "}
                  <span className="text-slate-700">
                    {[
                      user.anydeskId && `AnyDesk ${user.anydeskId}`,
                      user.teamviewerId && `TeamViewer ${user.teamviewerId}`,
                      user.ultraviewerId && `UltraViewer ${user.ultraviewerId}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}
            </div>

            {resetPassword && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-1.5 text-sm text-emerald-800">Nouveau mot de passe temporaire (également envoyé par email) :</p>
                <div className="flex items-center gap-2">
                  <code className="rounded-md border border-emerald-200 bg-white px-3 py-1 text-sm font-semibold text-emerald-700">
                    {resetPassword}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => setResetPassword(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {user.isSystemPlaceholder ? (
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
                Compte système généré automatiquement pour conserver les tickets, commentaires et matériels dont
                l'utilisateur d'origine a été supprimé. Il ne peut pas être modifié ni supprimé.
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button size="sm" onClick={startEdit}>
                  Modifier
                </Button>
                <Button size="sm" variant="secondary" loading={toggleActiveMutation.isPending} onClick={() => toggleActiveMutation.mutate()}>
                  {user.isActive ? "Désactiver" : "Activer"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={resetPasswordMutation.isPending}
                  onClick={() => resetPasswordMutation.mutate()}
                >
                  Réinitialiser le mot de passe
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                  Supprimer
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="space-y-4">
        <AssetMiniList assets={assignedAssets} />
        <TicketMiniList title="Tickets créés" tickets={requestedTickets} />
        {isStaff && <TicketMiniList title="Tickets assignés" tickets={assignedTickets} />}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cet utilisateur ?"
        description={`${user.name} (${user.email}) sera définitivement supprimé. Ses tickets, commentaires et matériels affectés seront conservés et réattribués à « Utilisateur supprimé ».`}
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
