import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import type { Company, Role, User } from "../types";

const ROLES: Role[] = ["USER", "AGENT", "ADMIN"];
const selectClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminUsers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get<{ users: User[] }>("/users")).data.users,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ role: Role; isActive: boolean; companyId: string }> }) =>
      apiClient.patch(`/users/${id}`, data),
    onSuccess: () => {
      toast.success("Utilisateur mis à jour");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action impossible")),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Utilisateurs</h1>

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
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2">
                  <select
                    value={u.company.id}
                    onChange={(e) => updateMutation.mutate({ id: u.id, data: { companyId: e.target.value } })}
                    className={selectClass}
                  >
                    {companies?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-slate-500">{u.service}</td>
                <td className="px-4 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => updateMutation.mutate({ id: u.id, data: { role: e.target.value as Role } })}
                    className={selectClass}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      u.isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {u.isActive ? "Actif" : "Désactivé"}
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
