import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { isOverdue, computeElapsedHours } from "../services/sla.service";

const dateFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function avgResolutionOf(tickets: { createdAt: Date; resolvedAt: Date | null }[]): number | null {
  const resolved = tickets.filter((t) => t.resolvedAt);
  if (resolved.length === 0) return null;
  return (
    resolved.reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000, 0) /
    resolved.length
  );
}

function totalElapsedOf(tickets: { createdAt: Date; resolvedAt: Date | null }[]): number {
  return tickets.reduce((sum, t) => sum + computeElapsedHours(t), 0);
}

export async function getDashboard(req: Request, res: Response) {
  const { from, to } = dateFilterSchema.parse(req.query);
  if (from && to && from > to) throw new HttpError(400, "La date de début doit précéder la date de fin");

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);

  const tickets = await prisma.ticket.findMany({
    where: { isArchived: false, ...(from || to ? { createdAt } : {}) },
    select: {
      id: true,
      status: true,
      dueAt: true,
      priorityId: true,
      priority: { select: { name: true } },
      createdAt: true,
      resolvedAt: true,
      requester: {
        select: { id: true, name: true, isSystemPlaceholder: true, company: { select: { id: true, name: true, isSystemPlaceholder: true } } },
      },
      assignee: { select: { id: true, name: true, isSystemPlaceholder: true } },
    },
  });

  const byStatus: Record<string, number> = { PENDING_APPROVAL: 0, OPEN: 0, IN_PROGRESS: 0, ON_HOLD: 0, RESOLVED: 0, CLOSED: 0 };
  const byPriority: Record<string, number> = {};
  let overdueCount = 0;

  for (const ticket of tickets) {
    byStatus[ticket.status] = (byStatus[ticket.status] ?? 0) + 1;
    byPriority[ticket.priority.name] = (byPriority[ticket.priority.name] ?? 0) + 1;
    if (isOverdue(ticket)) overdueCount += 1;
  }

  const avgResolutionHours = avgResolutionOf(tickets);
  const totalElapsedHours = totalElapsedOf(tickets);

  type StatRow = {
    id: string;
    name: string;
    total: number;
    open: number;
    resolved: number;
    overdue: number;
    avgResolutionHours: number | null;
    totalElapsedHours: number;
  };

  const companyGroups = new Map<string, { name: string; tickets: typeof tickets }>();
  const agentGroups = new Map<string, { name: string; tickets: typeof tickets }>();
  const userGroups = new Map<string, { name: string; tickets: typeof tickets }>();

  // On pré-remplit avec l'ensemble des agents/admins actifs pour qu'un membre
  // de l'équipe apparaisse dans les stats même s'il n'a encore aucun ticket assigné.
  const staffUsers = await prisma.user.findMany({
    where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true, isSystemPlaceholder: false },
    select: { id: true, name: true },
  });
  for (const staffUser of staffUsers) {
    agentGroups.set(staffUser.id, { name: staffUser.name, tickets: [] });
  }

  for (const ticket of tickets) {
    const company = ticket.requester.company;
    if (company && !company.isSystemPlaceholder) {
      const g = companyGroups.get(company.id) ?? { name: company.name, tickets: [] };
      g.tickets.push(ticket);
      companyGroups.set(company.id, g);
    }

    if (ticket.assignee && !ticket.assignee.isSystemPlaceholder) {
      const g = agentGroups.get(ticket.assignee.id) ?? { name: ticket.assignee.name, tickets: [] };
      g.tickets.push(ticket);
      agentGroups.set(ticket.assignee.id, g);
    }

    const requester = ticket.requester;
    if (!requester.isSystemPlaceholder) {
      const g = userGroups.get(requester.id) ?? { name: requester.name, tickets: [] };
      g.tickets.push(ticket);
      userGroups.set(requester.id, g);
    }
  }

  const summarize = (id: string, name: string, group: typeof tickets): StatRow => ({
    id,
    name,
    total: group.length,
    open: group.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length,
    resolved: group.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length,
    overdue: group.filter((t) => isOverdue(t)).length,
    avgResolutionHours: avgResolutionOf(group),
    totalElapsedHours: totalElapsedOf(group),
  });

  const byCompany = [...companyGroups.entries()]
    .map(([id, g]) => summarize(id, g.name, g.tickets))
    .sort((a, b) => b.total - a.total);

  const byAgent = [...agentGroups.entries()]
    .map(([id, g]) => summarize(id, g.name, g.tickets))
    .sort((a, b) => b.total - a.total);

  const byUser = [...userGroups.entries()]
    .map(([id, g]) => {
      const { avgResolutionHours: _unused, ...rest } = summarize(id, g.name, g.tickets);
      return rest;
    })
    .sort((a, b) => b.total - a.total);

  res.json({
    total: tickets.length,
    byStatus,
    byPriority,
    overdueCount,
    avgResolutionHours,
    totalElapsedHours,
    byCompany,
    byAgent,
    byUser,
  });
}
