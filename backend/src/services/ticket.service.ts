import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeDueAt } from "./sla.service";
import { generateTicketReference } from "./ticketReference.service";
import { sendMail } from "./email.service";
import type { TicketChannel } from "@prisma/client";

export const ticketInclude = {
  type: true,
  category: true,
  subCategory: true,
  priority: true,
  requester: { select: { id: true, name: true, email: true, service: { select: { id: true, name: true } }, company: true } },
  assignee: { select: { id: true, name: true, email: true } },
  process: { select: { id: true, name: true, category: true, requiresManagerApproval: true, requiresPhysicalForm: true, formTemplateUrl: true } },
  approval: { include: { approver: { select: { id: true, name: true, email: true } } } },
  physicalFormArchivedBy: { select: { id: true, name: true } },
};

interface CreateTicketParams {
  title: string;
  description: string;
  typeId: string;
  categoryId: string;
  subCategoryId?: string | null;
  priorityId: string;
  requesterId: string;
  channel: TicketChannel;
  processId?: string | null;
  notify?: boolean;
}

export async function createTicketRecord(params: CreateTicketParams) {
  const [type, category, priority] = await Promise.all([
    prisma.ticketType.findUnique({ where: { id: params.typeId } }),
    prisma.category.findUnique({ where: { id: params.categoryId } }),
    prisma.priority.findUnique({ where: { id: params.priorityId } }),
  ]);
  if (!type || !type.isActive) throw new HttpError(400, "Type de demande invalide");
  if (!category || !category.isActive) throw new HttpError(400, "Catégorie invalide");
  if (!priority) throw new HttpError(400, "Priorité invalide");

  if (params.subCategoryId) {
    const subCategory = await prisma.subCategory.findUnique({ where: { id: params.subCategoryId } });
    if (!subCategory || !subCategory.isActive || subCategory.categoryId !== params.categoryId) {
      throw new HttpError(400, "Sous-catégorie invalide pour cette catégorie");
    }
  }

  let process: { id: string; name: string; requiresManagerApproval: boolean } | null = null;
  let approverId: string | null = null;

  if (params.processId) {
    const [requester, proc] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.requesterId } }),
      prisma.process.findUnique({ where: { id: params.processId } }),
    ]);
    if (!requester) throw new HttpError(400, "Demandeur invalide");
    if (!proc || !proc.isActive) throw new HttpError(400, "Processus invalide");
    if (!requester.isDepartmentHead) {
      throw new HttpError(403, "Seuls les responsables de service peuvent lancer une demande de ce processus IT");
    }
    if (proc.requiresManagerApproval) {
      if (!requester.managerId) {
        throw new HttpError(400, "Aucun supérieur hiérarchique n'est défini sur votre fiche : impossible de soumettre cette demande");
      }
      approverId = requester.managerId;
    }
    process = proc;
  }

  const reference = await generateTicketReference();
  const dueAt = computeDueAt(priority);

  const ticket = await prisma.ticket.create({
    data: {
      reference,
      title: params.title,
      description: params.description,
      channel: params.channel,
      typeId: params.typeId,
      categoryId: params.categoryId,
      subCategoryId: params.subCategoryId ?? null,
      priorityId: params.priorityId,
      requesterId: params.requesterId,
      processId: process?.id ?? null,
      status: approverId ? "PENDING_APPROVAL" : undefined,
      dueAt,
    },
    include: ticketInclude,
  });

  if (process) {
    const steps = await prisma.processStep.findMany({
      where: { processId: process.id, isActive: true },
      orderBy: { order: "asc" },
    });
    if (steps.length > 0) {
      await prisma.processStepCompletion.createMany({
        data: steps.map((s) => ({ ticketId: ticket.id, processStepId: s.id })),
      });
    }

    if (approverId) {
      await prisma.processApproval.create({ data: { ticketId: ticket.id, approverId } });
      if (params.notify !== false) {
        const approver = await prisma.user.findUnique({ where: { id: approverId } });
        if (approver) {
          void sendMail({
            to: approver.email,
            subject: `[${ticket.reference}] Validation requise : ${process.name}`,
            text: `Bonjour ${approver.name},\n\n${ticket.requester.name} a soumis une demande "${process.name}" (${ticket.title}) qui nécessite votre validation en tant que supérieur hiérarchique.\n\nConnectez-vous à ITicket pour l'approuver ou la refuser (ticket ${ticket.reference}).`,
          });
        }
      }
    }
  }

  if (params.notify !== false) {
    const pending = ticket.status === "PENDING_APPROVAL";
    void sendMail({
      to: ticket.requester.email,
      subject: `[${ticket.reference}] Ticket créé : ${ticket.title}`,
      text: pending
        ? `Bonjour ${ticket.requester.name},\n\nVotre demande "${ticket.title}" (référence ${ticket.reference}) a bien été créée et est en attente de validation de votre supérieur hiérarchique avant prise en charge par l'IT.\n\nCordialement,\nSupport IT`
        : `Bonjour ${ticket.requester.name},\n\nVotre ticket "${ticket.title}" a bien été créé (référence ${ticket.reference}) via le canal ${ticket.channel}.\nNotre équipe support va le traiter dans les meilleurs délais.\n\nCordialement,\nSupport IT`,
    });

    if (!pending) {
      const agents = await prisma.user.findMany({
        where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
        select: { email: true },
      });
      for (const agent of agents) {
        void sendMail({
          to: agent.email,
          subject: `[${ticket.reference}] Nouveau ticket (${ticket.channel}) : ${ticket.title}`,
          text: `Un nouveau ticket a été créé par ${ticket.requester.name} via ${ticket.channel}.\nType : ${type.name}\nCatégorie : ${category.name}\nPriorité : ${priority.name}\n\n${ticket.description}`,
        });
      }
    }
  }

  return ticket;
}

export async function resolveDefaultTicketTypeId(preferredName?: string): Promise<string> {
  if (preferredName) {
    const match = await prisma.ticketType.findFirst({ where: { name: preferredName, isActive: true } });
    if (match) return match.id;
  }
  const fallback =
    (await prisma.ticketType.findFirst({ where: { name: "Incident", isActive: true } })) ??
    (await prisma.ticketType.findFirst({ where: { isActive: true }, orderBy: { name: "asc" } }));
  if (!fallback) throw new HttpError(500, "Aucun type de demande disponible");
  return fallback.id;
}

export async function resolveDefaultCategoryId(preferredName?: string): Promise<string> {
  if (preferredName) {
    const match = await prisma.category.findFirst({ where: { name: preferredName, isActive: true } });
    if (match) return match.id;
  }
  const fallback =
    (await prisma.category.findFirst({ where: { name: "Autre", isActive: true } })) ??
    (await prisma.category.findFirst({ where: { isActive: true }, orderBy: { name: "asc" } }));
  if (!fallback) throw new HttpError(500, "Aucune catégorie disponible");
  return fallback.id;
}

export async function resolveDefaultPriorityId(preferredName?: string): Promise<string> {
  if (preferredName) {
    const match = await prisma.priority.findFirst({ where: { name: preferredName } });
    if (match) return match.id;
  }
  const fallback =
    (await prisma.priority.findFirst({ where: { name: "Moyenne" } })) ??
    (await prisma.priority.findFirst({ orderBy: { level: "asc" } }));
  if (!fallback) throw new HttpError(500, "Aucune priorité disponible");
  return fallback.id;
}
