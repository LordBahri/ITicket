import type { TicketStatus } from "../types";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING_APPROVAL: "En attente de validation",
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  ON_HOLD: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

export const STATUS_BADGE_STYLES: Record<TicketStatus, string> = {
  PENDING_APPROVAL: "bg-purple-100 text-purple-700",
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-slate-200 text-slate-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

export const STATUS_BAR_COLORS: Record<TicketStatus, string> = {
  PENDING_APPROVAL: "bg-purple-400",
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  ON_HOLD: "bg-slate-400",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-slate-300",
};
