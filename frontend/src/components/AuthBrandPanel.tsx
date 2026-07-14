const FEATURES = [
  { icon: "🎫", text: "Suivi centralisé de toutes vos demandes IT" },
  { icon: "⏱️", text: "SLA automatiques par priorité" },
  { icon: "💬", text: "Web, email, Slack, Teams — un seul endroit" },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative">
        <div className="mb-1 flex items-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-base">🎫</span>
          ITicket
        </div>
      </div>

      <div className="relative">
        <h1 className="mb-4 max-w-md text-3xl font-bold leading-tight">Le support IT de votre société, simplifié.</h1>
        <p className="mb-8 max-w-sm text-brand-100">
          Créez, suivez et résolvez vos demandes d'intervention en un seul endroit, quel que soit le canal utilisé.
        </p>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-sm text-brand-50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">
                {f.icon}
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative text-xs text-brand-200">Service IT interne</div>
    </div>
  );
}
