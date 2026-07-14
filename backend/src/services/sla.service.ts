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
