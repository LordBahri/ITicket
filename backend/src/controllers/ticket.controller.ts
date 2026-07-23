import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeDueAt, isOverdue, computeElapsedHours } from "../services/sla.service";
import { sendMail } from "../services/email.service";
import { createTicketRecord, ticketInclude } from "../services/ticket.service";
import { STATUS_LABELS } from "../constants/ticketStatus";
import { renderTicketEmail, escapeHtml } from "../services/emailTemplate";
import { runSageAccessAutomation } from "../services/sageAccess.service";

const TICKET_CHANNELS = ["WEB", "EMAIL", "CHAT", "API", "PHONE", "SLACK", "TEAMS"] as const;
const TICKET_STATUSES = ["PENDING_APPROVAL", "OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"] as const;

const createTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  typeId: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  channel: z.enum(TICKET_CHANNELS).optional(),
  processId: z.string().optional(),
  beneficiaryId: z.string().optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  beneficiaryId: z.string().nullable().optional(),
  typeId: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
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
  archived: z.enum(["true", "false"]).optional(),
});

function serializeTicket(ticket: any) {
  return { ...ticket, isOverdue: isOverdue(ticket), elapsedHours: computeElapsedHours(ticket) };
}

export async function createTicket(req: Request, res: Response) {
  const data = createTicketSchema.parse(req.body);

  const ticket = await createTicketRecord({
    title: data.title,
    description: data.description,
    typeId: data.typeId,
    categoryId: data.categoryId,
    subCategoryId: data.subCategoryId,
    requesterId: req.user!.id,
    channel: data.channel ?? "WEB",
    processId: data.processId,
    beneficiaryId: data.beneficiaryId,
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
  // Par défaut, les tickets archivés sont masqués des listes courantes.
  where.isArchived = query.archived === "true";
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

  if (data.typeId || data.categoryId || data.subCategoryId) {
    const effectiveTypeId = data.typeId ?? ticket.typeId;
    const effectiveCategoryId = data.categoryId ?? ticket.categoryId;
    const effectiveSubCategoryId = data.subCategoryId ?? ticket.subCategoryId;

    const [type, category, subCategory] = await Promise.all([
      prisma.ticketType.findUnique({ where: { id: effectiveTypeId } }),
      prisma.category.findUnique({ where: { id: effectiveCategoryId } }),
      prisma.subCategory.findUnique({ where: { id: effectiveSubCategoryId }, include: { priority: true } }),
    ]);
    if (!type) throw new HttpError(400, "Type de demande invalide");
    if (!category || category.ticketTypeId !== effectiveTypeId) {
      throw new HttpError(400, "Catégorie invalide pour ce type de demande");
    }
    if (!subCategory || subCategory.categoryId !== effectiveCategoryId) {
      throw new HttpError(400, "Sous-catégorie invalide pour cette catégorie");
    }

    updateData.typeId = effectiveTypeId;
    updateData.categoryId = effectiveCategoryId;
    updateData.subCategoryId = effectiveSubCategoryId;
    // La priorité suit toujours automatiquement la sous-catégorie choisie.
    updateData.priorityId = subCategory.priorityId;
    updateData.dueAt = computeDueAt(subCategory.priority, ticket.createdAt);
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

  if (data.beneficiaryId !== undefined) {
    if (data.beneficiaryId) {
      const beneficiary = await prisma.user.findUnique({ where: { id: data.beneficiaryId } });
      if (!beneficiary || !beneficiary.isActive) throw new HttpError(400, "Utilisateur bénéficiaire invalide");
    }
    updateData.beneficiaryId = data.beneficiaryId;
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

  let updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: updateData,
    include: ticketInclude,
  });

  if (data.status && data.status !== ticket.status) {
    await prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, status: data.status, changedById: req.user!.id },
    });
    updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: ticketInclude });
  }

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

  const hasOtherChanges = Boolean(data.typeId || data.categoryId || data.subCategoryId);
  if (hasOtherChanges) {
    const changes: string[] = [];
    if (data.typeId) changes.push(`Type : ${updated.type.name}`);
    if (data.categoryId) changes.push(`Catégorie : ${updated.category.name}`);
    if (data.subCategoryId) changes.push(`Sous-catégorie : ${updated.subCategory.name}`);
    changes.push(`Priorité : ${updated.priority.name}`);

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
  await prisma.ticketStatusHistory.create({
    data: { ticketId: approval.ticketId, status: "OPEN", changedById: req.user!.id },
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
  await prisma.ticketStatusHistory.create({
    data: { ticketId: approval.ticketId, status: "CLOSED", changedById: req.user!.id },
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

export async function archiveTicket(req: Request, res: Response) {
  const ticket = await getTicketOr404(req.params.id);
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { isArchived: true, archivedAt: new Date() },
    include: ticketInclude,
  });
  res.json({ ticket: serializeTicket(updated) });
}

export async function unarchiveTicket(req: Request, res: Response) {
  const ticket = await getTicketOr404(req.params.id);
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { isArchived: false, archivedAt: null },
    include: ticketInclude,
  });
  res.json({ ticket: serializeTicket(updated) });
}

export async function deleteTicket(req: Request, res: Response) {
  const ticket = await getTicketOr404(req.params.id);
  // Les commentaires, pièces jointes, approbation, étapes de processus et historique de statut
  // sont en cascade (onDelete: Cascade) sur le ticket.
  await prisma.ticket.delete({ where: { id: ticket.id } });
  res.status(204).send();
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

export async function automateSageAccess(req: Request, res: Response) {
  const ticket = await getTicketOr404(req.params.id);

  if (!ticket.process?.supportsSageAutomation) {
    throw new HttpError(400, "Ce ticket n'est pas associé à un processus prenant en charge l'automatisation Sage");
  }

  const target = ticket.beneficiary ?? ticket.requester;
  if (!target.adUsername) {
    throw new HttpError(
      400,
      `Aucun identifiant AD renseigné sur la fiche de ${target.name} : renseignez-le avant de lancer l'automatisation`
    );
  }
  const sageDatabaseName = target.company?.sageDatabaseName;
  if (!sageDatabaseName) {
    throw new HttpError(
      400,
      `Aucun nom de base Sage renseigné sur la fiche de la société ${target.company?.name ?? ""} : renseignez-le avant de lancer l'automatisation`
    );
  }

  const result = await runSageAccessAutomation({ adUsername: target.adUsername, sageDatabaseName });

  const stepResults: Record<string, boolean> = { RDP: result.rdp.ok, FILES: result.files.ok, SQL: result.sql.ok };
  for (const completion of ticket.stepCompletions) {
    const key = completion.processStep.automationKey;
    if (key && stepResults[key] && !completion.isDone) {
      await prisma.processStepCompletion.update({
        where: { id: completion.id },
        data: { isDone: true, doneAt: new Date(), doneById: req.user!.id },
      });
    }
  }

  const updated = await getTicketOr404(req.params.id);
  res.json({ result, ticket: serializeTicket(updated) });
}
