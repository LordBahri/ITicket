import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeDueAt, isOverdue } from "../services/sla.service";
import { sendMail } from "../services/email.service";
import { createTicketRecord, ticketInclude } from "../services/ticket.service";

const TICKET_CHANNELS = ["WEB", "EMAIL", "CHAT", "API", "PHONE", "SLACK", "TEAMS"] as const;
const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"] as const;

const createTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  categoryId: z.string(),
  priorityId: z.string(),
  channel: z.enum(TICKET_CHANNELS).optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  categoryId: z.string().optional(),
  priorityId: z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  categoryId: z.string().optional(),
  priorityId: z.string().optional(),
  assigneeId: z.string().optional(),
  companyId: z.string().optional(),
  search: z.string().optional(),
  overdue: z.enum(["true", "false"]).optional(),
});

function serializeTicket(ticket: any) {
  return { ...ticket, isOverdue: isOverdue(ticket) };
}

export async function createTicket(req: Request, res: Response) {
  const data = createTicketSchema.parse(req.body);

  const ticket = await createTicketRecord({
    title: data.title,
    description: data.description,
    categoryId: data.categoryId,
    priorityId: data.priorityId,
    requesterId: req.user!.id,
    channel: data.channel ?? "WEB",
  });

  res.status(201).json({ ticket: serializeTicket(ticket) });
}

export async function listTickets(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";

  const where: Record<string, unknown> = {};
  if (!isStaff) {
    where.requesterId = req.user!.id;
  }
  if (query.status) where.status = query.status;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.priorityId) where.priorityId = query.priorityId;
  if (query.assigneeId) where.assigneeId = query.assigneeId;
  if (query.companyId) where.requester = { companyId: query.companyId };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { reference: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: ticketInclude,
    orderBy: { createdAt: "desc" },
  });

  let result = tickets.map(serializeTicket);
  if (query.overdue === "true") result = result.filter((t) => t.isOverdue);
  if (query.overdue === "false") result = result.filter((t) => !t.isOverdue);

  res.json({ tickets: result });
}

async function getTicketOr404(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ...ticketInclude,
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  return ticket;
}

function assertAccess(req: Request, ticket: { requesterId: string }) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  if (!isStaff && ticket.requesterId !== req.user!.id) {
    throw new HttpError(403, "Accès refusé");
  }
}

export async function getTicket(req: Request, res: Response) {
  const ticket = await getTicketOr404(req.params.id);
  assertAccess(req, ticket);

  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  const comments = isStaff ? ticket.comments : ticket.comments.filter((c) => !c.isInternal);

  res.json({ ticket: { ...serializeTicket(ticket), comments } });
}

export async function updateTicket(req: Request, res: Response) {
  const data = updateTicketSchema.parse(req.body);
  const ticket = await getTicketOr404(req.params.id);

  const updateData: Record<string, unknown> = {};

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new HttpError(400, "Catégorie invalide");
    updateData.categoryId = data.categoryId;
  }

  if (data.priorityId) {
    const priority = await prisma.priority.findUnique({ where: { id: data.priorityId } });
    if (!priority) throw new HttpError(400, "Priorité invalide");
    updateData.priorityId = data.priorityId;
    updateData.dueAt = computeDueAt(priority, ticket.createdAt);
  }

  if (data.assigneeId !== undefined) {
    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
      if (!assignee || (assignee.role !== "AGENT" && assignee.role !== "ADMIN")) {
        throw new HttpError(400, "Assigné invalide");
      }
    }
    updateData.assigneeId = data.assigneeId;
  }

  if (data.status) {
    updateData.status = data.status;
    if (data.status === "RESOLVED" && !ticket.resolvedAt) updateData.resolvedAt = new Date();
    if (data.status === "CLOSED" && !ticket.closedAt) updateData.closedAt = new Date();
    if (data.status !== "RESOLVED" && data.status !== "CLOSED") {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: updateData,
    include: ticketInclude,
  });

  if (data.assigneeId && updated.assignee) {
    void sendMail({
      to: updated.assignee.email,
      subject: `[${updated.reference}] Ticket qui vous a été assigné`,
      text: `Le ticket "${updated.title}" vous a été assigné.\n\n${updated.description}`,
    });
  }

  if (data.status) {
    void sendMail({
      to: updated.requester.email,
      subject: `[${updated.reference}] Statut mis à jour : ${data.status}`,
      text: `Le statut de votre ticket "${updated.title}" est maintenant : ${data.status}.`,
    });
  }

  res.json({ ticket: serializeTicket(updated) });
}
