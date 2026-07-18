import { env } from "../config/env";
import { STATUS_COLORS, STATUS_LABELS } from "../constants/ticketStatus";
import type { TicketStatus } from "@prisma/client";

const BRAND_DARK = "#1a1f3d";
const BRAND_HEADER = "#282f66";
const BRAND_ACCENT = "#404f95";
const BORDER = "#e2e4ee";
const TEXT_MUTED = "#5a5f77";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

interface DetailRow {
  label: string;
  value: string | null | undefined;
}

function detailsTable(rows: DetailRow[]): string {
  const cells = rows
    .filter((row) => row.value)
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 16px;border-bottom:1px solid ${BORDER};color:${TEXT_MUTED};font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 16px;border-bottom:1px solid ${BORDER};color:${BRAND_DARK};font-size:13px;font-weight:600;">${escapeHtml(row.value!)}</td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;border-collapse:collapse;">${cells}</table>`;
}

interface TicketLike {
  id: string;
  reference: string;
  title: string;
  description?: string | null;
  status: TicketStatus;
  type?: { name: string } | null;
  category?: { name: string } | null;
  subCategory?: { name: string } | null;
  priority?: { name: string } | null;
  requester?: { name: string } | null;
  assignee?: { name: string } | null;
  dueAt?: Date | string | null;
  createdAt?: Date | string | null;
}

function formatDate(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadge(status: TicketStatus): string {
  const color = STATUS_COLORS[status];
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${color}1a;color:${color};font-size:12px;font-weight:700;">${escapeHtml(STATUS_LABELS[status])}</span>`;
}

function wrapEmail(opts: { preheader?: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f2f3f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(26,31,61,0.08);">
            <tr>
              <td style="background:${BRAND_HEADER};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">ITicket</span>
                <span style="color:#b4bfe6;font-size:13px;display:block;margin-top:2px;">Support IT — Meninx Holding</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8f9fc;border-top:1px solid ${BORDER};">
                <p style="margin:0;color:${TEXT_MUTED};font-size:12px;line-height:1.5;">
                  Ceci est un email automatique envoyé par ITicket, ne pas répondre directement à ce message.
                  Pour toute question, contactez le support IT à
                  <a href="mailto:support@meninx.tn" style="color:${BRAND_ACCENT};">support@meninx.tn</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="border-radius:8px;background:${BRAND_ACCENT};">
        <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function renderTicketEmail(opts: {
  heading: string;
  greeting?: string;
  introHtml: string;
  ticket: TicketLike;
  extraNote?: string;
}): { html: string; text: string } {
  const t = opts.ticket;
  const ticketUrl = `${env.frontendUrl.replace(/\/$/, "")}/tickets/${t.id}`;

  const bodyHtml = `
    <h1 style="margin:0 0 16px;color:${BRAND_DARK};font-size:20px;">${escapeHtml(opts.heading)}</h1>
    <div style="color:${BRAND_DARK};font-size:14px;line-height:1.6;margin-bottom:20px;">${opts.introHtml}</div>
    <div style="margin-bottom:20px;">${statusBadge(t.status)}</div>
    ${detailsTable([
      { label: "Référence", value: t.reference },
      { label: "Titre", value: t.title },
      { label: "Type", value: t.type?.name },
      { label: "Catégorie", value: [t.category?.name, t.subCategory?.name].filter(Boolean).join(" / ") || undefined },
      { label: "Priorité", value: t.priority?.name },
      { label: "Demandeur", value: t.requester?.name },
      { label: "Assigné à", value: t.assignee?.name ?? "Non assigné" },
      { label: "Créé le", value: formatDate(t.createdAt) },
      { label: "Échéance", value: formatDate(t.dueAt) },
    ])}
    ${
      t.description
        ? `<div style="margin-top:20px;">
             <div style="color:${TEXT_MUTED};font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:6px;">Description</div>
             <div style="background:#f8f9fc;border:1px solid ${BORDER};border-radius:8px;padding:14px 16px;color:${BRAND_DARK};font-size:13px;line-height:1.6;">${nl2br(t.description)}</div>
           </div>`
        : ""
    }
    ${opts.extraNote ? `<p style="margin-top:20px;color:${TEXT_MUTED};font-size:13px;line-height:1.6;">${nl2br(opts.extraNote)}</p>` : ""}
    ${ctaButton("Voir le ticket dans ITicket", ticketUrl)}
  `;

  const textLines = [
    opts.heading,
    "",
    `Référence : ${t.reference}`,
    `Titre : ${t.title}`,
    `Statut : ${STATUS_LABELS[t.status]}`,
    t.type?.name ? `Type : ${t.type.name}` : "",
    t.category?.name ? `Catégorie : ${[t.category.name, t.subCategory?.name].filter(Boolean).join(" / ")}` : "",
    t.priority?.name ? `Priorité : ${t.priority.name}` : "",
    t.requester?.name ? `Demandeur : ${t.requester.name}` : "",
    `Assigné à : ${t.assignee?.name ?? "Non assigné"}`,
    t.description ? `\nDescription :\n${t.description}` : "",
    opts.extraNote ? `\n${opts.extraNote}` : "",
    `\nVoir le ticket : ${ticketUrl}`,
  ].filter((line) => line !== "");

  return { html: wrapEmail({ preheader: opts.heading, bodyHtml }), text: textLines.join("\n") };
}

export function renderSimpleEmail(opts: { heading: string; bodyHtml: string; bodyText: string }): { html: string; text: string } {
  const bodyHtml = `
    <h1 style="margin:0 0 16px;color:${BRAND_DARK};font-size:20px;">${escapeHtml(opts.heading)}</h1>
    <div style="color:${BRAND_DARK};font-size:14px;line-height:1.7;">${opts.bodyHtml}</div>
  `;
  return { html: wrapEmail({ preheader: opts.heading, bodyHtml }), text: opts.bodyText };
}
