import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { isOverdue } from "../services/sla.service";

function avgResolutionOf(tickets: { createdAt: Date; resolvedAt: Date | null }[]): number | null {
  const resolved = tickets.filter((t) => t.resolvedAt);
  if (resolved.length === 0) return null;
  return (
    resolved.reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000, 0) /
    resolved.length
  );
}

export async function getDashboard(req: Request, res: Response) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  const where = isStaff ? {} : { requesterId: req.user!.id };

  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      id: true,
      status: true,
      dueAt: true,
      priorityId: true,
      priority: { select: { name: true } },
      createdAt: true,
      resolvedAt: true,
      requester: { select: { id: true, name: true, company: { select: { id: true, name: true, isSystemPlaceholder: true } } } },
      assignee: { select: { id: true, name: true } },
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

  let byCompany: { id: string; name: string; total: number; open: number; resolved: number; overdue: number; avgResolutionHours: number | null }[] = [];
  let byAgent: { id: string; name: string; total: number; open: number; resolved: number; overdue: number; avgResolutionHours: number | null }[] = [];
  let byUser: { id: string; name: string; total: number; open: number; resolved: number; overdue: number }[] = [];

  if (isStaff) {
    const companyGroups = new Map<string, { name: string; tickets: typeof tickets }>();
    const agentGroups = new Map<string, { name: string; tickets: typeof tickets }>();
    const userGroups = new Map<string, { name: string; tickets: typeof tickets }>();

    for (const ticket of tickets) {
      const company = ticket.requester.company;
      if (company && !company.isSystemPlaceholder) {
        const g = companyGroups.get(company.id) ?? { name: company.name, tickets: [] };
        g.tickets.push(ticket);
        companyGroups.set(company.id, g);
      }

      if (ticket.assignee) {
        const g = agentGroups.get(ticket.assignee.id) ?? { name: ticket.assignee.name, tickets: [] };
        g.tickets.push(ticket);
        agentGroups.set(ticket.assignee.id, g);
      }

      const requester = ticket.requester;
      const g = userGroups.get(requester.id) ?? { name: requester.name, tickets: [] };
      g.tickets.push(ticket);
      userGroups.set(requester.id, g);
    }

    const summarize = (id: string, name: string, group: typeof tickets) => ({
      id,
      name,
      total: group.length,
      open: group.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length,
      resolved: group.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length,
      overdue: group.filter((t) => isOverdue(t)).length,
      avgResolutionHours: avgResolutionOf(group),
    });

    byCompany = [...companyGroups.entries()]
      .map(([id, g]) => summarize(id, g.name, g.tickets))
      .sort((a, b) => b.total - a.total);

    byAgent = [...agentGroups.entries()]
      .map(([id, g]) => summarize(id, g.name, g.tickets))
      .sort((a, b) => b.total - a.total);

    byUser = [...userGroups.entries()]
      .map(([id, g]) => {
        const { avgResolutionHours: _unused, ...rest } = summarize(id, g.name, g.tickets);
        return rest;
      })
      .sort((a, b) => b.total - a.total);
  }

  res.json({
    total: tickets.length,
    byStatus,
    byPriority,
    overdueCount,
    avgResolutionHours,
    byCompany,
    byAgent,
    byUser,
  });
}
