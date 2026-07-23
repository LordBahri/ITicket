import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { IconBook } from "../components/icons";

const MANUAL_CARDS = [
  { to: "/manual/user", title: "Manuel Utilisateur", description: "Créer et suivre vos tickets, chat support, base de connaissances." },
  { to: "/manual/agent", title: "Manuel Agent", description: "Gérer les tickets, les processus IT et répondre aux utilisateurs." },
  { to: "/manual/admin", title: "Manuel Administrateur", description: "Tableau de bord, statistiques et administration complète d'ITicket." },
];

export function ManualHub() {
  const { user } = useAuth();

  if (user?.role === "USER") return <Navigate to="/manual/user" replace />;
  if (user?.role === "AGENT") return <Navigate to="/manual/agent" replace />;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Manuel d'utilisation</h1>
      <p className="mb-6 text-sm text-slate-500">Choisissez le manuel correspondant au profil que vous souhaitez consulter.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MANUAL_CARDS.map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="h-full p-5 transition hover:border-brand-300 hover:shadow-md">
              <IconBook className="mb-3 h-5 w-5 text-brand-600" />
              <h2 className="mb-1 text-sm font-semibold text-slate-900">{c.title}</h2>
              <p className="text-xs text-slate-500">{c.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
