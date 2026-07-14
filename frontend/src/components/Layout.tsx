import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconLogoMark,
  IconDashboard,
  IconTicket,
  IconPlus,
  IconBook,
  IconLayers,
  IconTag,
  IconClock,
  IconUsers,
  IconBuilding,
  IconLogout,
} from "./icons";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
  }`;

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5">
        <div className="mb-8 flex items-center gap-2.5 px-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IconLogoMark className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold text-slate-900">ITicket</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          <NavLink to="/" end className={navLinkClass}>
            <IconDashboard className="h-[18px] w-[18px] shrink-0" /> Tableau de bord
          </NavLink>
          <NavLink to="/tickets" className={navLinkClass}>
            <IconTicket className="h-[18px] w-[18px] shrink-0" /> {isStaff ? "Tous les tickets" : "Mes tickets"}
          </NavLink>
          <NavLink to="/tickets/new" className={navLinkClass}>
            <IconPlus className="h-[18px] w-[18px] shrink-0" /> Nouveau ticket
          </NavLink>
          <NavLink to="/knowledge" className={navLinkClass}>
            <IconBook className="h-[18px] w-[18px] shrink-0" /> Base de connaissances
          </NavLink>
          {user?.role === "ADMIN" && (
            <>
              <div className="mb-1.5 mt-7 border-t border-slate-100 px-3 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Administration
              </div>
              <NavLink to="/admin/ticket-types" className={navLinkClass}>
                <IconLayers className="h-[18px] w-[18px] shrink-0" /> Types de demande
              </NavLink>
              <NavLink to="/admin/categories" className={navLinkClass}>
                <IconTag className="h-[18px] w-[18px] shrink-0" /> Catégories
              </NavLink>
              <NavLink to="/admin/priorities" className={navLinkClass}>
                <IconClock className="h-[18px] w-[18px] shrink-0" /> Priorités &amp; SLA
              </NavLink>
              <NavLink to="/admin/companies" className={navLinkClass}>
                <IconBuilding className="h-[18px] w-[18px] shrink-0" /> Sociétés
              </NavLink>
              <NavLink to="/admin/users" className={navLinkClass}>
                <IconUsers className="h-[18px] w-[18px] shrink-0" /> Utilisateurs
              </NavLink>
            </>
          )}
        </nav>

        <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 p-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <IconLogout className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Service IT — Ticketing</div>
        </header>
        <main className="flex-1 bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
