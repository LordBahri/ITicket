import nodemailer from "nodemailer";
import { env } from "../config/env";

const isConfigured = Boolean(env.smtp.host);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

interface MailOptions {
  to: string;
  subject: string;
  text: string;
}

// Les emails sont peu fréquents et arrivent parfois par petites rafales (plusieurs
// destinataires pour un même événement). Une connexion SMTP persistante (pool)
// reste ouverte trop longtemps entre deux rafales et Office 365 la coupe côté
// serveur sans prévenir, ce qui fait échouer l'envoi suivant. On sérialise donc
// les envois via cette file : jamais plus d'une connexion SMTP ouverte à la fois
// (évite le throttling "concurrent connections"), et chaque envoi ouvre puis
// ferme sa propre connexion (évite la connexion qui traîne et devient obsolète).
let queue: Promise<void> = Promise.resolve();

export function sendMail({ to, subject, text }: MailOptions): Promise<void> {
  if (!transporter) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${text}`);
    return Promise.resolve();
  }

  const task = queue.then(() =>
    transporter.sendMail({ from: env.mailFrom, to, subject, text }).then(
      () => undefined,
      (err) => {
        console.error("Échec de l'envoi de l'email :", err);
      }
    )
  );
  queue = task;
  return task;
}
