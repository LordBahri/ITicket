import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeDueAt, isOverdue } from "../services/sla.service";
import { sendMail } from "../services/email.service";
import { createTicketRecord, ticketInclude } from "../services/ticket.service";
import { STATUS_LABELS } from "../constants/ticketStatus";
import { renderTicketEmail, escapeHtml } from "../services/emailTemplate";

const TICKET_CHANNELS = ["WEB", "EMAIL", "CHAT", "API", "PHONE", "SLACK", "TEAMS"] as const;
const TICKET_STATUSES = ["PENDING_APPROVAL", "OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"] as const;

const createTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  typeId: z.string(),
  categoryId: z.string(),
  subCategoryId: z.string().optional(),
  priorityId: z.string(),
  channel: z.enum(TICKET_CHANNELS).optional(),
  processId: z.string().optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  typeId: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().nullable().optional(),
  priorityId: z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  typeId: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  priorityId: z.string().optional(),
  assigneeId: z.string().optional(),
  requesterId: z.string().optional(),
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
    typeId: data.typeId,
    categoryId: data.categoryId,
    subCategoryId: data.subCategoryId,
    priorityId: data.priorityId,
    requesterId: req.user!.id,
    channel: data.channel ?? "WEB",
    processId: data.processId,
  });

  res.status(201).json({ ticket: serializeTicket(ticket) });
}

export async function listTickets(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";

  const where: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  if (!isStaff) {
    // Un demandeur voit ses propres tickets ; un supérieur hiérarchique voit aussi les demandes en attente de sa validation.
    andConditions.push({ OR: [{ requesterId: req.user!.id }, { approval: { approverId: req.user!.id } }] });
  } else if (query.requesterId) {
    where.requesterId = query.requesterId;
  }
  if (query.status) where.status = query.status;
  if (query.typeId) where.typeId = query.typeId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.subCategoryId) where.subCategoryId = query.subCategoryId;
  if (query.priorityId) where.priorityId = query.priorityId;
  if (query.assigneeId) where.assigneeId = query.assigneeId;
  if (query.companyId) where.requester = { companyId: query.companyId };
  if (query.search) {
    andConditions.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { reference: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }
  if (andConditions.length > 0) where.AND = andConditions;

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
      stepCompletions: {
        include: { processStep: true, doneBy: { select: { id: true, name: true } } },
        orderBy: { processStep: { order: "asc" } },
      },
    },
  });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  return ticket;
}

function assertAccess(req: Request, ticket: { requesterId: string; approval: { approverId: string } | null }) {
  const isStaff = req.user!.role === "AGENT" || req.user!.role === "ADMIN";
  const isApprover = ticket.approval?.approverId === req.user!.id;
  if (!isStaff && ticket.requesterId !== req.user!.id && !isApprover) {
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

  if (data.typeId) {
    const type = await prisma.ticketType.findUnique({ where: { id: data.typeId } });
    if (!type) throw new HttpError(400, "Type de demande invalide");
    updateData.typeId = data.typeId;
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new HttpError(400, "Catégorie invalide");
    updateData.categoryId = data.categoryId;
  }

  if (data.subCategoryId !== undefined) {
    if (data.subCategoryId) {
      const subCategory = await prisma.subCategory.findUnique({ where: { id: data.subCategoryId } });
      const effectiveCategoryId = (updateData.categoryId as string | undefined) ?? ticket.categoryId;
      if (!subCategory || subCategory.categoryId !== effectiveCategoryId) {
        throw new HttpError(400, "Sous-catégorie invalide pour cette catégorie");
      }
    }
    updateData.subCategoryId = data.subCategoryId;
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

  // Destinataires "parties prenantes" du ticket (demandeur + assigné), sans doublon
  const stakeholders = [updated.requester, updated.assignee].filter(
    (u, i, arr): u is NonNullable<typeof u> => Boolean(u) && arr.findIndex((x) => x?.email === u!.email) === i
  );

  if (data.assigneeId && updated.assignee) {
    const assigneeMail = renderTicketEmail({
      heading: "Ticket qui vous a été assigné",
      introHtml: `Le ticket <strong>${escapeHtml(updated.title)}</strong> vous a été assigné.`,
      ticket: updated,
    });
    void sendMail({ to: updated.assignee.email, subject: `[${updated.reference}] Ticket qui vous a été assigné`, ...assigneeMail });

    if (updated.requester.email !== updated.assignee.email) {
      const requesterMail = renderTicketEmail({
        heading: "Votre ticket a été assigné",
        introHtml: `Votre ticket <strong>${escapeHtml(updated.title)}</strong> a été assigné à <strong>${escapeHtml(updated.assignee.name)}</strong>.`,
        ticket: updated,
      });
      void sendMail({ to: updated.requester.email, subject: `[${updated.reference}] Votre ticket a été assigné`, ...requesterMail });
    }
  }

  if (data.status === "CLOSED") {
    const mail = renderTicketEmail({
      heading: `Ticket fermé : ${updated.title}`,
      introHtml: `Le ticket <strong>${escapeHtml(updated.title)}</strong> a été fermé.`,
      ticket: updated,
      extraNote: "Si le problème persiste, vous pouvez répondre à ce ticket depuis le portail pour le rouvrir. Merci d'avoir utilisé le support IT.",
    });
    for (const person of stakeholders) {
      void sendMail({ to: person.email, subject: `[${updated.reference}] Ticket fermé : ${updated.title}`, ...mail });
    }
  } else if (data.status) {
    const mail = renderTicketEmail({
      heading: `Statut mis à jour : ${STATUS_LABELS[data.status]}`,
      introHtml: `Le statut du ticket <strong>${escapeHtml(updated.title)}</strong> est maintenant : <strong>${escapeHtml(STATUS_LABELS[data.status])}</strong>.`,
      ticket: updated,
    });
    for (const person of stakeholders) {
      void sendMail({ to: person.email, subject: `[${updated.reference}] Statut mis à jour : ${STATUS_LABELS[data.status]}`, ...mail });
    }
  }

  const hasOtherChanges = Boolean(data.typeId || data.categoryId || data.subCategoryId !== undefined || data.priorityId);
  if (hasOtherChanges) {
    const changes: string[] = [];
    if (data.typeId) changes.push(`Type : ${updated.type.name}`);
    if (data.categoryId) changes.push(`Catégorie : ${updated.category.name}`);
    if (data.subCategoryId !== undefined) changes.push(`Sous-catégorie : ${updated.subCategory?.name ?? "—"}`);
    if (data.priorityId) changes.push(`Priorité : ${updated.priority.name}`);

    const mail = renderTicketEmail({
      heading: `Ticket mis à jour : ${updated.title}`,
      introHtml: `Le ticket <strong>${escapeHtml(updated.title)}</strong> a été modifié.`,
      ticket: updated,
      extraNote: changes.join(" · "),
    });
    for (const person of stakeholders) {
      void sendMail({ to: person.email, subject: `[${updated.reference}] Ticket mis à jour : ${updated.title}`, ...mail });
    }
  }

  res.json({ ticket: serializeTicket(updated) });
}

const decisionSchema = z.object({ comment: z.string().max(1000).optional() });
const rejectSchema = z.object({ comment: z.string().min(3, "Merci d'indiquer le motif du refus").max(1000) });

async function getApprovalOr404(ticketId: string) {
  const approval = await prisma.processApproval.findUnique({
    where: { ticketId },
    include: { approver: { select: { id: true, name: true, email: true } } },
  });
  if (!approval) throw new HttpError(404, "Aucune validation en attente pour ce ticket");
  return approval;
}

function assertApprover(req: Request, approval: { approverId: string }) {
  if (approval.approverId !== req.user!.id && req.user!.role !== "ADMIN") {
    throw new HttpError(403, "Seul le supérieur hiérarchique désigné peut traiter cette demande");
  }
}

export async function approveTicketProcess(req: Request, res: Response) {
  const { comment } = decisionSchema.parse(req.body);
  const approval = await getApprovalOr404(req.params.id);
  assertApprover(req, approval);
  if (approval.status !== "PENDING") throw new HttpError(400, "Cette demande a déjà été traitée");

  await prisma.processApproval.update({
    where: { id: approval.id },
    data: { status: "APPROVED", comment, decidedAt: new Date() },
  });
  const updated = await prisma.ticket.update({
    where: { id: approval.ticketId },
    data: { status: "OPEN" },
    include: ticketInclude,
  });

  const approverName = req.user!.id === approval.approverId ? approval.approver.name : "un administrateur";
  const requesterMail = renderTicketEmail({
    heading: `Demande validée : ${updated.title}`,
    introHtml: `Votre demande <strong>${escapeHtml(updated.title)}</strong> a été validée par <strong>${escapeHtml(approverName)}</strong>. Elle est maintenant prise en charge par l'équipe IT.`,
    ticket: updated,
  });
  void sendMail({ to: updated.requester.email, subject: `[${updated.reference}] Demande validée : ${updated.title}`, ...requesterMail });

  const agents = await prisma.user.findMany({ where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true }, select: { email: true } });
  const agentMail = renderTicketEmail({
    heading: `Demande de processus validée : ${updated.title}`,
    introHtml: `La demande <strong>${escapeHtml(updated.title)}</strong> (${escapeHtml(updated.process?.name ?? "")}) a été validée par le supérieur hiérarchique et peut être traitée.`,
    ticket: updated,
  });
  for (const agent of agents) {
    void sendMail({ to: agent.email, subject: `[${updated.reference}] Demande de processus validée : ${updated.title}`, ...agentMail });
  }

  res.json({ ticket: serializeTicket(updated) });
}

export async function rejectTicketProcess(req: Request, res: Response) {
  const { comment } = rejectSchema.parse(req.body);
  const approval = await getApprovalOr404(req.params.id);
  assertApprover(req, approval);
  if (approval.status !== "PENDING") throw new HttpError(400, "Cette demande a déjà été traitée");

  await prisma.processApproval.update({
    where: { id: approval.id },
    data: { status: "REJECTED", comment, decidedAt: new Date() },
  });
  const updated = await prisma.ticket.update({
    where: { id: approval.ticketId },
    data: { status: "CLOSED", closedAt: new Date() },
    include: ticketInclude,
  });

  const rejectMail = renderTicketEmail({
    heading: `Demande refusée : ${updated.title}`,
    introHtml: `Votre demande <strong>${escapeHtml(updated.title)}</strong> a été refusée par votre supérieur hiérarchique.`,
    ticket: updated,
    extraNote: `Motif : ${comment}`,
  });
  void sendMail({ to: updated.requester.email, subject: `[${updated.reference}] Demande refusée : ${updated.title}`, ...rejectMail });

  res.json({ ticket: serializeTicket(updated) });
}

const toggleStepSchema = z.object({ isDone: z.boolean() });

export async function toggleProcessStep(req: Request, res: Response) {
  const { isDone } = toggleStepSchema.parse(req.body);
  const completion = await prisma.processStepCompletion.findUnique({ where: { id: req.params.completionId } });
  if (!completion || completion.ticketId !== req.params.id) throw new HttpError(404, "Étape introuvable");

  const updated = await prisma.processStepCompletion.update({
    where: { id: completion.id },
    data: {
      isDone,
      doneAt: isDone ? new Date() : null,
      doneById: isDone ? req.user!.id : null,
    },
    include: { processStep: true, doneBy: { select: { id: true, name: true } } },
  });
  res.json({ step: updated });
}

export async function archiveTicketForm(req: Request, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { physicalFormArchivedAt: new Date(), physicalFormArchivedById: req.user!.id },
    include: ticketInclude,
  });
  res.json({ ticket: serializeTicket(updated) });
}
