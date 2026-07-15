import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { sendMail } from "./email.service";

const DAY_MS = 24 * 60 * 60 * 1000;

const THRESHOLDS = [
  { days: 30, field: "reminder30Sent" as const },
  { days: 7, field: "reminder7Sent" as const },
  { days: 1, field: "reminder1Sent" as const },
];

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

async function notifyAdmins(subject: string, text: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { email: true } });
  await Promise.all(admins.map((admin) => sendMail({ to: admin.email, subject, text })));
}

async function checkLicenses() {
  const licenses = await prisma.license.findMany({
    where: { expiryDate: { gte: new Date(), lte: new Date(Date.now() + 31 * DAY_MS) } },
    include: { company: { select: { name: true } } },
  });

  for (const license of licenses) {
    const remaining = daysUntil(license.expiryDate);

    const crossed = THRESHOLDS.filter((t) => remaining <= t.days);
    const unsent = crossed.filter((t) => !license[t.field]);
    if (unsent.length === 0) continue;

    // N'envoie qu'un seul email par vérification, pour le seuil le plus urgent déjà franchi.
    const mostUrgent = unsent[unsent.length - 1];

    const scope = license.company ? `société ${license.company.name}` : "toutes sociétés";
    const subject = `[ITicket] Licence "${license.name}" expire dans ${remaining} jour(s)`;
    const text = [
      `La licence "${license.name}" (${scope}) expire le ${license.expiryDate.toLocaleDateString("fr-FR")}.`,
      license.vendor ? `Éditeur : ${license.vendor}` : null,
      `Sièges : ${license.seats}`,
      "",
      "Merci de vérifier le renouvellement dans ITicket (Administration > Licences).",
    ]
      .filter(Boolean)
      .join("\n");

    await notifyAdmins(subject, text);
    // Marque aussi les seuils moins urgents déjà franchis pour éviter un rappel redondant plus tard.
    await prisma.license.update({
      where: { id: license.id },
      data: Object.fromEntries(crossed.map((t) => [t.field, true])),
    });
  }
}

export function startLicenseReminder() {
  console.log(`[license-reminder] Démarrage de la vérification des licences (toutes les ${env.licenseReminder.intervalMs}ms)`);
  void checkLicenses().catch((err) => console.error("[license-reminder] Erreur :", err));
  setInterval(() => void checkLicenses().catch((err) => console.error("[license-reminder] Erreur :", err)), env.licenseReminder.intervalMs);
}
