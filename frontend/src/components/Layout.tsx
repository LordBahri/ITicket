import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import {
  IconHome,
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
  IconMonitor,
  IconKey,
  IconWorkflow,
  IconMail,
  IconWhatsApp,
  IconRemote,
  IconLock,
  IconChat,
  IconManual,
} from "./icons";
import { Avatar } from "./ui/Avatar";
import { TopProgressBar } from "./ui/TopProgressBar";

const SUPPORT_EMAIL = "support@meninx.tn";
const SUPPORT_PHONE_DISPLAY = "+216 58 94 44 17";
const SUPPORT_WHATSAPP_LINK = "https://wa.me/21658944417";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const { totalUnread } = useChat();
  const location = useLocation();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";
  const isAllTicketsActive = location.pathname.startsWith("/tickets") && location.pathname !== "/tickets/new";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5">
        <div className="mb-8 flex items-center gap-2.5 px-1">
          <img src="/logo-iticket-mark.svg" alt="ITicket System" className="h-9 w-9" />
          <span className="text-lg font-bold text-slate-900">ITicket</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          <NavLink to="/" end className={navLinkClass}>
            <IconHome className="h-[18px] w-[18px] shrink-0" /> Accueil
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/dashboard" className={navLinkClass}>
              <IconDashboard className="h-[18px] w-[18px] shrink-0" /> Tableau de bord
            </NavLink>
          )}
          <NavLink to="/tickets" className={() => navLinkClass({ isActive: isAllTicketsActive })}>
            <IconTicket className="h-[18px] w-[18px] shrink-0" /> {isStaff ? "Tous les tickets" : "Mes tickets"}
          </NavLink>
          <NavLink to="/tickets/new" className={navLinkClass}>
            <IconPlus className="h-[18px] w-[18px] shrink-0" /> Nouveau ticket
          </NavLink>
          <NavLink to="/knowledge" className={navLinkClass}>
            <IconBook className="h-[18px] w-[18px] shrink-0" /> Base de connaissances
          </NavLink>
          <NavLink to="/manual" className={() => navLinkClass({ isActive: location.pathname.startsWith("/manual") })}>
            <IconManual className="h-[18px] w-[18px] shrink-0" /> Manuel d'utilisation
          </NavLink>
          <NavLink to="/chat" className={navLinkClass}>
            <IconChat className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">Chat</span>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                {totalUnread}
              </span>
            )}
          </NavLink>
          {isStaff && (
            <NavLink to="/remote-access" className={navLinkClass}>
              <IconRemote className="h-[18px] w-[18px] shrink-0" /> Accès à distance
            </NavLink>
          )}
          {user?.role === "ADMIN" && (
            <>
              <div className="mb-1.5 mt-7 border-t border-slate-100 px-3 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Administration IT
              </div>
              <NavLink to="/admin/companies" className={navLinkClass}>
                <IconBuilding className="h-[18px] w-[18px] shrink-0" /> Sociétés
              </NavLink>
              <NavLink to="/admin/users" className={navLinkClass}>
                <IconUsers className="h-[18px] w-[18px] shrink-0" /> Utilisateurs
              </NavLink>
              <NavLink to="/admin/assets" className={navLinkClass}>
                <IconMonitor className="h-[18px] w-[18px] shrink-0" /> Matériel
              </NavLink>
              <NavLink to="/admin/licenses" className={navLinkClass}>
                <IconKey className="h-[18px] w-[18px] shrink-0" /> Licences
              </NavLink>
              <NavLink to="/admin/processes" className={navLinkClass}>
                <IconWorkflow className="h-[18px] w-[18px] shrink-0" /> Processus IT
              </NavLink>

              <div className="mb-1.5 mt-7 border-t border-slate-100 px-3 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Administration ITicket
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
            </>
          )}
        </nav>

        <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 p-2">
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.role}</p>
          </div>
          <NavLink
            to="/account"
            title="Mon compte"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <IconLock className="h-[18px] w-[18px]" />
          </NavLink>
          <button
            onClick={logout}
            title="Déconnexion"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <IconLogout className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative flex shrink-0 items-center justify-end bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-6 py-3">
          <TopProgressBar />
          <div className="flex items-center gap-5 text-sm text-white/90">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-1.5 transition hover:text-white">
              <IconMail className="h-4 w-4 shrink-0" />
              {SUPPORT_EMAIL}
            </a>
            <a
              href={SUPPORT_WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
            >
              <IconWhatsApp className="h-4 w-4 shrink-0" />
              {SUPPORT_PHONE_DISPLAY}
            </a>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
