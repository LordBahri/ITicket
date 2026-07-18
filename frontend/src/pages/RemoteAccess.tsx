import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Card } from "../components/ui/Card";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { IconRemote, IconInfo, IconWhatsApp } from "../components/icons";
import type { RemoteAccessUser } from "../types";

function cleanId(id: string) {
  return id.replace(/\s+/g, "");
}

function cleanPhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function ConnectButton({ label, href, icon }: { label: string; href: string; icon?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
    >
      {icon}
      {label}
    </a>
  );
}

function groupByCompany(users: RemoteAccessUser[]) {
  const groups: { companyId: string; companyName: string; users: RemoteAccessUser[] }[] = [];
  for (const u of users) {
    const last = groups[groups.length - 1];
    if (last && last.companyId === u.company.id) {
      last.users.push(u);
    } else {
      groups.push({ companyId: u.company.id, companyName: u.company.name, users: [u] });
    }
  }
  return groups;
}

export function RemoteAccess() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", "remote-access"],
    queryFn: async () => (await apiClient.get<{ users: RemoteAccessUser[] }>("/users/remote-access")).data.users,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.pcName ?? "").toLowerCase().includes(q) ||
        u.company.name.toLowerCase().includes(q)
    );
  }, [users, search]);

  const groups = useMemo(() => groupByCompany(filtered), [filtered]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Accès à distance</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur, un poste…"
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        Les boutons « AnyDesk », « TeamViewer » et « UltraViewer » ouvrent l'application installée sur ce poste via son
        ID ; le bouton « WhatsApp » ouvre une conversation WhatsApp avec le numéro de l'utilisateur (cliquez ensuite
        sur l'icône d'appel dans WhatsApp pour lancer l'appel). Renseignez ces identifiants et le téléphone depuis la
        fiche utilisateur (
        <Link to="/admin/users" className="text-brand-700 hover:underline">
          Utilisateurs
        </Link>
        ). Si l'application ne s'ouvre pas automatiquement, vérifiez qu'elle est bien installée sur votre poste.
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Utilisateur</th>
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2">Poste</th>
              <th className="px-4 py-2">Accès distant</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  <IconRemote className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  Aucun utilisateur avec un accès à distance ou un téléphone configuré.
                </td>
              </tr>
            )}
            {groups.map((group) => (
              <Fragment key={group.companyId}>
                <tr className="bg-slate-100">
                  <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {group.companyName}
                  </td>
                </tr>
                {group.users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">
                      <Link to={`/admin/users/${u.id}`} className="text-brand-700 hover:underline">
                        {u.name}
                      </Link>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{u.service?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{u.pcName ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {u.anydeskId && <ConnectButton label="AnyDesk" href={`anydesk:${cleanId(u.anydeskId)}`} />}
                        {u.teamviewerId && (
                          <ConnectButton
                            label="TeamViewer"
                            href={`teamviewer10://control?device=${cleanId(u.teamviewerId)}&type=1`}
                          />
                        )}
                        {u.ultraviewerId && (
                          <ConnectButton label="UltraViewer" href={`ultraviewer://${cleanId(u.ultraviewerId)}`} />
                        )}
                        {u.phone && (
                          <ConnectButton
                            label="WhatsApp"
                            href={`https://wa.me/${cleanPhone(u.phone)}`}
                            icon={<IconWhatsApp className="h-3.5 w-3.5" />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
