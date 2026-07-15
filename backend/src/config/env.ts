import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
  mailFrom: process.env.MAIL_FROM ?? "IT Support <support@societe.local>",
  uploads: {
    dir: process.env.UPLOAD_DIR ?? "uploads",
    maxSizeMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
  },
  imap: {
    host: process.env.IMAP_HOST ?? "",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: process.env.IMAP_SECURE !== "false",
    user: process.env.IMAP_USER ?? "",
    pass: process.env.IMAP_PASS ?? "",
    pollIntervalMs: Number(process.env.IMAP_POLL_INTERVAL_MS ?? 60_000),
  },
  slack: {
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
    botToken: process.env.SLACK_BOT_TOKEN ?? "",
  },
  teams: {
    webhookSecret: process.env.TEAMS_WEBHOOK_SECRET ?? "",
  },
  licenseReminder: {
    intervalMs: Number(process.env.LICENSE_REMINDER_INTERVAL_MS ?? 24 * 60 * 60 * 1000),
  },
};
