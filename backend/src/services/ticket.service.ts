import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeDueAt } from "./sla.service";
import { generateTicketReference } from "./ticketReference.service";
import { sendMail } from "./email.service";
import { renderTicketEmail, escapeHtml } from "./emailTemplate";
import type { TicketChannel } from "@prisma/client";

export const ticketInclude = {
  type: true,
  category: true,
  subCategory: { include: { priority: true } },
  priority: true,
  requester: {
    select: { id: true, name: true, email: true, adUsername: true, service: { select: { id: true, name: true } }, company: true },
  },
  assignee: { select: { id: true, name: true, email: true } },
  beneficiary: { select: { id: true, name: true, email: true, adUsername: true, company: true } },
  beneficiaryLinks: { select: { user: { select: { id: true, name: true, email: true } } } },
  process: {
    select: {
      id: true,
      name: true,
      category: true,
      requiresManagerApproval: true,
      requiresPhysicalForm: true,
      formTemplateUrl: true,
      supportsSageAutomation: true,
      allowsMultipleBeneficiaries: true,
      formFields: true,
    },
  },
  approval: { include: { approver: { select: { id: true, name: true, email: true } } } },
  physicalFormArchivedBy: { select: { id: true, name: true } },
  sageDatabaseAccess: { select: { sageDatabase: { select: { id: true, name: true } } } },
  statusHistory: {
    orderBy: { createdAt: "asc" as const },
    include: { changedBy: { select: { id: true, name: true } } },
  },
};

interface CreateTicketParams {
  title: string;
  description: string;
  typeId?: string;
  categoryId?: string;
  subCategoryId?: string;
  requesterId: string;
  channel: TicketChannel;
  processId?: string | null;
  beneficiaryId?: string | null;
  beneficiaryIds?: string[];
  formData?: Record<string, unknown>;
  sageDatabaseIds?: string[];
  notify?: boolean;
}

interface ProcessFormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "checkbox";
  required: boolean;
}

async function isTicketTypeReservedForProcess(typeId: string): Promise<boolean> {
  const count = await prisma.process.count({ where: { typeId, isActive: true } });
  return count > 0;
}

export async function createTicketRecord(params: CreateTicketParams) {
  let process:
    | {
        id: string;
        name: string;
        requiresManagerApproval: boolean;
        typeId: string;
        categoryId: string;
        subCategoryId: string;
        allowsMultipleBeneficiaries: boolean;
        formFields: unknown;
        supportsSageAutomation: boolean;
      }
    | null = null;
  let approverId: string | null = null;

  if (params.processId) {
    const [requester, proc] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.requesterId } }),
      prisma.process.findUnique({ where: { id: params.processId } }),
    ]);
    if (!requester) throw new HttpError(400, "Demandeur invalide");
    if (!proc || !proc.isActive) throw new HttpError(400, "Processus invalide");
    if (!proc.openToAllUsers && !requester.isDepartmentHead && requester.role !== "ADMIN") {
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

  // Le type/catégorie/sous-catégorie d'un ticket lié à un processus IT sont
  // imposés par le processus lui-même (non modifiables par l'utilisateur) ;
  // sinon, ils viennent du choix explicite du demandeur.
  const effectiveTypeId = process?.typeId ?? params.typeId;
  const effectiveCategoryId = process?.categoryId ?? params.categoryId;
  const effectiveSubCategoryId = process?.subCategoryId ?? params.subCategoryId;

  if (!effectiveTypeId || !effectiveCategoryId || !effectiveSubCategoryId) {
    throw new HttpError(400, "Type, catégorie et sous-catégorie sont obligatoires");
  }

  const [type, category, subCategory] = await Promise.all([
    prisma.ticketType.findUnique({ where: { id: effectiveTypeId } }),
    prisma.category.findUnique({ where: { id: effectiveCategoryId } }),
    prisma.subCategory.findUnique({ where: { id: effectiveSubCategoryId }, include: { priority: true } }),
  ]);
  if (!type || !type.isActive) throw new HttpError(400, "Type de demande invalide");
  if (!category || !category.isActive || category.ticketTypeId !== effectiveTypeId) {
    throw new HttpError(400, "Catégorie invalide pour ce type de demande");
  }
  if (!subCategory || !subCategory.isActive || subCategory.categoryId !== effectiveCategoryId) {
    throw new HttpError(400, "Sous-catégorie invalide pour cette catégorie");
  }

  if (!process && (await isTicketTypeReservedForProcess(effectiveTypeId))) {
    throw new HttpError(400, "Ce type de demande est réservé aux processus IT : passez par la sélection d'un processus");
  }

  if (params.beneficiaryId) {
    const beneficiary = await prisma.user.findUnique({ where: { id: params.beneficiaryId } });
    if (!beneficiary || !beneficiary.isActive) throw new HttpError(400, "Utilisateur bénéficiaire invalide");
  }

  let beneficiaryUsers: { id: string }[] = [];
  if (params.beneficiaryIds && params.beneficiaryIds.length > 0) {
    if (!process?.allowsMultipleBeneficiaries) {
      throw new HttpError(400, "Ce processus ne permet pas de sélectionner plusieurs bénéficiaires");
    }
    beneficiaryUsers = await prisma.user.findMany({
      where: { id: { in: params.beneficiaryIds }, isActive: true },
      select: { id: true },
    });
    if (beneficiaryUsers.length !== new Set(params.beneficiaryIds).size) {
      throw new HttpError(400, "Un ou plusieurs bénéficiaires sélectionnés sont invalides");
    }
  }

  const formFields = (process?.formFields as ProcessFormField[] | null) ?? [];
  if (formFields.length > 0) {
    const missing = formFields.filter((f) => {
      if (!f.required) return false;
      const value = params.formData?.[f.key];
      return f.type === "checkbox" ? value !== true : value === undefined || value === null || String(value).trim() === "";
    });
    if (missing.length > 0) {
      throw new HttpError(400, `Champs obligatoires manquants : ${missing.map((f) => f.label).join(", ")}`);
    }
  }

  let sageDatabases: { id: string; name: string }[] = [];
  if (params.sageDatabaseIds && params.sageDatabaseIds.length > 0) {
    if (!process?.supportsSageAutomation) {
      throw new HttpError(400, "Ce processus ne prend pas en charge la sélection de bases Sage");
    }
    sageDatabases = await prisma.sageDatabase.findMany({
      where: { id: { in: params.sageDatabaseIds }, isActive: true },
      select: { id: true, name: true },
    });
    if (sageDatabases.length !== new Set(params.sageDatabaseIds).size) {
      throw new HttpError(400, "Une ou plusieurs bases Sage sélectionnées sont invalides");
    }
  }

  const reference = await generateTicketReference();
  const dueAt = computeDueAt(subCategory.priority);

  let ticket = await prisma.ticket.create({
    data: {
      reference,
      title: params.title,
      description: params.description,
      channel: params.channel,
      typeId: effectiveTypeId,
      categoryId: effectiveCategoryId,
      subCategoryId: effectiveSubCategoryId,
      priorityId: subCategory.priorityId,
      requesterId: params.requesterId,
      beneficiaryId: params.beneficiaryId ?? null,
      processId: process?.id ?? null,
      status: approverId ? "PENDING_APPROVAL" : undefined,
      dueAt,
      formData: formFields.length > 0 ? (params.formData as object) : undefined,
    },
    include: ticketInclude,
  });

  if (beneficiaryUsers.length > 0) {
    await prisma.ticketBeneficiaryLink.createMany({
      data: beneficiaryUsers.map((u) => ({ ticketId: ticket.id, userId: u.id })),
    });
  }

  if (sageDatabases.length > 0) {
    const targetUserId = params.beneficiaryId ?? params.requesterId;
    await prisma.ticketSageDatabaseAccess.createMany({
      data: sageDatabases.map((db) => ({ ticketId: ticket.id, sageDatabaseId: db.id })),
    });
    for (const db of sageDatabases) {
      await prisma.userSageAccess.upsert({
        where: { userId_sageDatabaseId: { userId: targetUserId, sageDatabaseId: db.id } },
        update: {},
        create: { userId: targetUserId, sageDatabaseId: db.id, grantedById: params.requesterId },
      });
    }
  }

  await prisma.ticketStatusHistory.create({
    data: { ticketId: ticket.id, status: ticket.status, changedById: params.requesterId },
  });
  ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: ticketInclude });

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
          const mail = renderTicketEmail({
            heading: `Validation requise : ${process.name}`,
            introHtml: `Bonjour ${escapeHtml(approver.name)},<br /><br />${escapeHtml(ticket.requester.name)} a soumis une demande <strong>${escapeHtml(process.name)}</strong> qui nécessite votre validation en tant que supérieur hiérarchique.`,
            ticket,
            extraNote: "Connectez-vous à ITicket pour l'approuver ou la refuser.",
          });
          void sendMail({ to: approver.email, subject: `[${ticket.reference}] Validation requise : ${process.name}`, ...mail });
        }
      }
    }
  }

  if (params.notify !== false) {
    const pending = ticket.status === "PENDING_APPROVAL";
    const requesterMail = renderTicketEmail({
      heading: `Ticket créé : ${ticket.title}`,
      introHtml: pending
        ? `Bonjour ${escapeHtml(ticket.requester.name)},<br /><br />Votre demande <strong>${escapeHtml(ticket.title)}</strong> a bien été créée et est en attente de validation de votre supérieur hiérarchique avant prise en charge par l'IT.`
        : `Bonjour ${escapeHtml(ticket.requester.name)},<br /><br />Votre ticket <strong>${escapeHtml(ticket.title)}</strong> a bien été créé via le canal ${escapeHtml(ticket.channel)}. Notre équipe support va le traiter dans les meilleurs délais.`,
      ticket,
    });
    void sendMail({ to: ticket.requester.email, subject: `[${ticket.reference}] Ticket créé : ${ticket.title}`, ...requesterMail });

    if (!pending) {
      const agents = await prisma.user.findMany({
        where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
        select: { email: true },
      });
      const agentMail = renderTicketEmail({
        heading: `Nouveau ticket (${ticket.channel}) : ${ticket.title}`,
        introHtml: `Un nouveau ticket a été créé par <strong>${escapeHtml(ticket.requester.name)}</strong> via ${escapeHtml(ticket.channel)}.`,
        ticket,
      });
      for (const agent of agents) {
        void sendMail({ to: agent.email, subject: `[${ticket.reference}] Nouveau ticket (${ticket.channel}) : ${ticket.title}`, ...agentMail });
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

export async function resolveDefaultCategoryId(typeId: string, preferredName?: string): Promise<string> {
  if (preferredName) {
    const match = await prisma.category.findFirst({ where: { ticketTypeId: typeId, name: preferredName, isActive: true } });
    if (match) return match.id;
  }
  const fallback =
    (await prisma.category.findFirst({ where: { ticketTypeId: typeId, name: "Autre", isActive: true } })) ??
    (await prisma.category.findFirst({ where: { ticketTypeId: typeId, isActive: true }, orderBy: { name: "asc" } }));
  if (!fallback) throw new HttpError(500, "Aucune catégorie disponible pour ce type de demande");
  return fallback.id;
}

export async function resolveDefaultSubCategoryId(categoryId: string, preferredName?: string): Promise<string> {
  if (preferredName) {
    const match = await prisma.subCategory.findFirst({ where: { categoryId, name: preferredName, isActive: true } });
    if (match) return match.id;
  }
  const fallback =
    (await prisma.subCategory.findFirst({ where: { categoryId, name: "Autre", isActive: true } })) ??
    (await prisma.subCategory.findFirst({ where: { categoryId, isActive: true }, orderBy: { name: "asc" } }));
  if (!fallback) throw new HttpError(500, "Aucune sous-catégorie disponible pour cette catégorie");
  return fallback.id;
}
