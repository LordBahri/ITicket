import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeDueAt } from "./sla.service";
import { generateTicketReference } from "./ticketReference.service";
import { sendMail } from "./email.service";
import type { TicketChannel } from "@prisma/client";

export const ticketInclude = {
  category: true,
  priority: true,
  requester: { select: { id: true, name: true, email: true, service: true, company: true } },
  assignee: { select: { id: true, name: true, email: true } },
};

interface CreateTicketParams {
  title: string;
  description: string;
  categoryId: string;
  priorityId: string;
  requesterId: string;
  channel: TicketChannel;
  notify?: boolean;
}

export async function createTicketRecord(params: CreateTicketParams) {
  const [category, priority] = await Promise.all([
    prisma.category.findUnique({ where: { id: params.categoryId } }),
    prisma.priority.findUnique({ where: { id: params.priorityId } }),
  ]);
  if (!category || !category.isActive) throw new HttpError(400, "Catégorie invalide");
  if (!priority) throw new HttpError(400, "Priorité invalide");

  const reference = await generateTicketReference();
  const dueAt = computeDueAt(priority);

  const ticket = await prisma.ticket.create({
    data: {
      reference,
      title: params.title,
      description: params.description,
      channel: params.channel,
      categoryId: params.categoryId,
      priorityId: params.priorityId,
      requesterId: params.requesterId,
      dueAt,
    },
    include: ticketInclude,
  });

  if (params.notify !== false) {
    void sendMail({
      to: ticket.requester.email,
      subject: `[${ticket.reference}] Ticket créé : ${ticket.title}`,
      text: `Bonjour ${ticket.requester.name},\n\nVotre ticket "${ticket.title}" a bien été créé (référence ${ticket.reference}) via le canal ${ticket.channel}.\nNotre équipe support va le traiter dans les meilleurs délais.\n\nCordialement,\nSupport IT`,
    });

    const agents = await prisma.user.findMany({
      where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
      select: { email: true },
    });
    for (const agent of agents) {
      void sendMail({
        to: agent.email,
        subject: `[${ticket.reference}] Nouveau ticket (${ticket.channel}) : ${ticket.title}`,
        text: `Un nouveau ticket a été créé par ${ticket.requester.name} via ${ticket.channel}.\nCatégorie : ${category.name}\nPriorité : ${priority.name}\n\n${ticket.description}`,
      });
    }
  }

  return ticket;
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
