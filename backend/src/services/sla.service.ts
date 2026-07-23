import type { Priority, Ticket } from "@prisma/client";

export function computeDueAt(priority: Priority, from: Date = new Date()): Date {
  const due = new Date(from);
  due.setHours(due.getHours() + priority.resolutionTimeHours);
  return due;
}

export function isOverdue(ticket: Pick<Ticket, "status" | "dueAt">): boolean {
  if (!ticket.dueAt) return false;
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return false;
  return new Date() > ticket.dueAt;
}

/**
 * Temps écoulé (en heures) depuis la création du ticket jusqu'à sa résolution,
 * ou jusqu'à maintenant s'il est toujours ouvert. Sert à la fois d'indicateur
 * de suivi (fiche ticket) et de métrique agrégée dans les statistiques
 * (facturation du temps de support aux filiales).
 */
export function computeElapsedHours(ticket: Pick<Ticket, "createdAt" | "resolvedAt">): number {
  const end = ticket.resolvedAt ?? new Date();
  return (end.getTime() - ticket.createdAt.getTime()) / 3_600_000;
}
