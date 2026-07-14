import type { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";
import { ensureUserByEmail } from "../services/userProvision.service";
import { createTicketRecord, resolveDefaultCategoryId, resolveDefaultPriorityId } from "../services/ticket.service";

function verifySlackSignature(req: Request): boolean {
  if (!env.slack.signingSecret) return true; // vérification désactivée en dev si non configurée

  const timestamp = req.header("X-Slack-Request-Timestamp");
  const signature = req.header("X-Slack-Signature");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!timestamp || !signature || !rawBody) return false;

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody.toString("utf8")}`;
  const expected = `v0=${crypto.createHmac("sha256", env.slack.signingSecret).update(base).digest("hex")}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function resolveSlackUserEmail(userId: string, userName: string): Promise<{ email: string; name: string }> {
  if (env.slack.botToken) {
    try {
      const res = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${env.slack.botToken}` },
      });
      const data = (await res.json()) as { ok: boolean; user?: { profile?: { email?: string; real_name?: string } } };
      if (data.ok && data.user?.profile?.email) {
        return { email: data.user.profile.email, name: data.user.profile.real_name ?? userName };
      }
    } catch {
      // repli sur l'email synthétique ci-dessous
    }
  }
  return { email: `${userId}@slack.local`, name: userName };
}

const slackCommandSchema = z.object({
  text: z.string().default(""),
  user_id: z.string(),
  user_name: z.string().default("Utilisateur Slack"),
});

export async function slackCommand(req: Request, res: Response) {
  if (!verifySlackSignature(req)) {
    throw new HttpError(401, "Signature Slack invalide");
  }

  const data = slackCommandSchema.parse(req.body);
  const text = data.text.trim();
  if (!text) {
    return res.json({
      response_type: "ephemeral",
      text: "Merci de décrire votre demande : `/ticket <titre> | <description>`",
    });
  }

  const [title, ...rest] = text.split("|");
  const description = rest.join("|").trim() || title.trim();

  const { email, name } = await resolveSlackUserEmail(data.user_id, data.user_name);
  const requester = await ensureUserByEmail(email, name);

  const [categoryId, priorityId] = await Promise.all([resolveDefaultCategoryId(), resolveDefaultPriorityId()]);

  const ticket = await createTicketRecord({
    title: title.trim().slice(0, 200),
    description,
    categoryId,
    priorityId,
    requesterId: requester.id,
    channel: "SLACK",
  });

  res.json({
    response_type: "ephemeral",
    text: `Ticket créé : *${ticket.reference}* — ${ticket.title}. Vous recevrez les mises à jour par email.`,
  });
}

const teamsWebhookSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  userEmail: z.string().email(),
  userName: z.string().min(1).max(100),
  categoryName: z.string().optional(),
  priorityName: z.string().optional(),
});

export async function teamsWebhook(req: Request, res: Response) {
  if (env.teams.webhookSecret) {
    const secret = req.header("X-Teams-Secret");
    if (secret !== env.teams.webhookSecret) {
      throw new HttpError(401, "Secret Teams invalide");
    }
  }

  const data = teamsWebhookSchema.parse(req.body);
  const requester = await ensureUserByEmail(data.userEmail, data.userName);

  const [categoryId, priorityId] = await Promise.all([
    resolveDefaultCategoryId(data.categoryName),
    resolveDefaultPriorityId(data.priorityName),
  ]);

  const ticket = await createTicketRecord({
    title: data.title,
    description: data.description,
    categoryId,
    priorityId,
    requesterId: requester.id,
    channel: "TEAMS",
  });

  res.status(201).json({ reference: ticket.reference, id: ticket.id });
}
