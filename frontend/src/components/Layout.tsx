import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-2 text-lg font-bold text-slate-900">ITicket</div>
        <nav className="space-y-1">
          <NavLink to="/" end className={linkClass}>
            Tableau de bord
          </NavLink>
          <NavLink to="/tickets" className={linkClass}>
            {isStaff ? "Tous les tickets" : "Mes tickets"}
          </NavLink>
          <NavLink to="/tickets/new" className={linkClass}>
            Nouveau ticket
          </NavLink>
          {user?.role === "ADMIN" && (
            <>
              <div className="mt-4 px-3 text-xs font-semibold uppercase text-slate-400">Administration</div>
              <NavLink to="/admin/categories" className={linkClass}>
                Catégories
              </NavLink>
              <NavLink to="/admin/priorities" className={linkClass}>
                Priorités &amp; SLA
              </NavLink>
              <NavLink to="/admin/users" className={linkClass}>
                Utilisateurs
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Service IT — Ticketing</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">
              {user?.name} <span className="text-slate-400">({user?.role})</span>
            </span>
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Déconnexion
            </button>
          </div>
        </header>
        <main className="flex-1 bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
