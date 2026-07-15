import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { isOverdue } from "../services/sla.service";

export async function getDashboard(req: Request, res: Response) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  const where = isStaff ? {} : { requesterId: req.user!.id };

  const tickets = await prisma.ticket.findMany({
    where,
    select: { id: true, status: true, dueAt: true, priorityId: true, priority: { select: { name: true } }, createdAt: true, resolvedAt: true },
  });

  const byStatus: Record<string, number> = { PENDING_APPROVAL: 0, OPEN: 0, IN_PROGRESS: 0, ON_HOLD: 0, RESOLVED: 0, CLOSED: 0 };
  const byPriority: Record<string, number> = {};
  let overdueCount = 0;

  for (const ticket of tickets) {
    byStatus[ticket.status] = (byStatus[ticket.status] ?? 0) + 1;
    byPriority[ticket.priority.name] = (byPriority[ticket.priority.name] ?? 0) + 1;
    if (isOverdue(ticket)) overdueCount += 1;
  }

  const resolved = tickets.filter((t) => t.resolvedAt);
  const avgResolutionHours =
    resolved.length > 0
      ? resolved.reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000, 0) /
        resolved.length
      : null;

  res.json({
    total: tickets.length,
    byStatus,
    byPriority,
    overdueCount,
    avgResolutionHours,
  });
}
