import { IconLogoMark, IconTicket, IconClock, IconUsers } from "./icons";

const FEATURES = [
  { Icon: IconTicket, text: "Suivi centralisé de toutes vos demandes IT" },
  { Icon: IconClock, text: "SLA automatiques par priorité" },
  { Icon: IconUsers, text: "Web, email, Slack, Teams — un seul endroit" },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <IconLogoMark className="pointer-events-none absolute -right-16 -top-16 h-96 w-96 text-white/[0.06]" />

      <div className="relative">
        <div className="mb-1 flex items-center gap-2.5 text-lg font-bold">
          <img src="/logo-iticket-mark.svg" alt="ITicket System" className="h-10 w-10" />
          ITicket
        </div>
      </div>

      <div className="relative">
        <h1 className="mb-4 max-w-md text-3xl font-bold leading-tight">Le support IT de votre société, simplifié.</h1>
        <p className="mb-8 max-w-sm text-brand-100">
          Créez, suivez et résolvez vos demandes d'intervention en un seul endroit, quel que soit le canal utilisé.
        </p>
        <ul className="space-y-3">
          {FEATURES.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-brand-50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-2 text-xs uppercase tracking-widest text-brand-200">
        <IconLogoMark className="h-4 w-4" />
        Meninx Holding — Service IT
      </div>
    </div>
  );
}
