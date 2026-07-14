import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { env } from "../config/env";
import { ensureUserByEmail } from "./userProvision.service";
import { createTicketRecord, resolveDefaultCategoryId, resolveDefaultPriorityId } from "./ticket.service";

function extractSenderEmail(from?: string): { email: string; name: string } | null {
  if (!from) return null;
  const match = from.match(/<([^>]+)>/);
  const email = (match ? match[1] : from).trim().toLowerCase();
  const name = match ? from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() : email;
  if (!email.includes("@")) return null;
  return { email, name: name || email };
}

async function processMailbox(client: ImapFlow) {
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = await client.search({ seen: false }, { uid: true });
    if (!uids || uids.length === 0) return;

    const [categoryId, priorityId] = await Promise.all([resolveDefaultCategoryId(), resolveDefaultPriorityId()]);

    for (const uid of uids) {
      try {
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!message || !message.source) continue;

        const parsed = await simpleParser(message.source);
        const sender = extractSenderEmail(parsed.from?.text);
        if (!sender) {
          await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
          continue;
        }

        const requester = await ensureUserByEmail(sender.email, sender.name);
        const title = (parsed.subject || "Demande reçue par email").slice(0, 200);
        const description = (parsed.text || parsed.html?.toString() || "(message sans contenu texte)").slice(0, 5000);

        await createTicketRecord({
          title,
          description,
          categoryId,
          priorityId,
          requesterId: requester.id,
          channel: "EMAIL",
        });

        await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
      } catch (err) {
        console.error(`[email-ingestion] Échec du traitement du message ${uid} :`, err);
      }
    }
  } finally {
    lock.release();
  }
}

async function pollOnce() {
  const client = new ImapFlow({
    host: env.imap.host,
    port: env.imap.port,
    secure: env.imap.secure,
    auth: { user: env.imap.user, pass: env.imap.pass },
    logger: false,
  });

  try {
    await client.connect();
    await processMailbox(client);
  } catch (err) {
    console.error("[email-ingestion] Erreur de connexion IMAP :", err);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export function startEmailIngestion() {
  if (!env.imap.host) {
    console.log("[email-ingestion] IMAP_HOST non configuré : ingestion email désactivée");
    return;
  }

  console.log(`[email-ingestion] Démarrage du polling IMAP (${env.imap.pollIntervalMs}ms)`);
  void pollOnce();
  setInterval(() => void pollOnce(), env.imap.pollIntervalMs);
}
