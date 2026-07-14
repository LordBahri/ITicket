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

export async function sendMail({ to, subject, text }: MailOptions): Promise<void> {
  if (!transporter) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${text}`);
    return;
  }

  try {
    await transporter.sendMail({ from: env.mailFrom, to, subject, text });
  } catch (err) {
    console.error("Échec de l'envoi de l'email :", err);
  }
}
