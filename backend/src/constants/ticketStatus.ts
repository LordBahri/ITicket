import type { TicketStatus } from "@prisma/client";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING_APPROVAL: "En attente de validation",
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  ON_HOLD: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  PENDING_APPROVAL: "#8b5e00",
  OPEN: "#2f3c7e",
  IN_PROGRESS: "#0f6e3f",
  ON_HOLD: "#8b5e00",
  RESOLVED: "#0f6e3f",
  CLOSED: "#5a5a5a",
};
