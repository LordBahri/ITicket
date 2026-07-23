import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DashboardStats } from "../types";
import { STATUS_LABELS } from "../constants/ticketStatus";
import { formatDuration } from "./duration";

const BRAND = [15, 76, 129] as const; // brand-800-ish navy
const BRAND_LIGHT = [224, 236, 247] as const;
const SLATE = [100, 116, 139] as const;

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  return formatDuration(hours);
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo-meninx.png");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportDashboardPdf(data: DashboardStats): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let cursorY = 16;

  const logo = await loadLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", marginX, cursorY - 4, 22, 22);
    } catch {
      // logo format unsupported, ignore silently
    }
  }

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Tableau de bord IT", logo ? marginX + 28 : marginX, cursorY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  const now = new Date();
  doc.text(
    `Rapport généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    logo ? marginX + 28 : marginX,
    cursorY + 13,
  );

  cursorY += 26;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;

  // --- Summary KPI cards ---
  const kpis: [string, string][] = [
    ["Tickets au total", String(data.total)],
    ["Ouverts", String(data.byStatus.OPEN)],
    ["En cours", String(data.byStatus.IN_PROGRESS)],
    ["En retard (SLA)", String(data.overdueCount)],
  ];
  const cardWidth = (pageWidth - marginX * 2 - 3 * 4) / 4;
  kpis.forEach(([label, value], i) => {
    const x = marginX + i * (cardWidth + 4);
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(x, cursorY, cardWidth, 20, 2, 2, "F");
    doc.setTextColor(...SLATE);
    doc.setFontSize(8);
    doc.text(label, x + 3, cursorY + 6);
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(value, x + 3, cursorY + 15);
    doc.setFont("helvetica", "normal");
  });
  cursorY += 28;

  if (data.avgResolutionHours !== null) {
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text(`Temps moyen de résolution : ${formatHours(data.avgResolutionHours)}`, marginX, cursorY);
    cursorY += 6;
  }
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(`Temps total écoulé (tous tickets) : ${formatDuration(data.totalElapsedHours)}`, marginX, cursorY);
  cursorY += 6;

  const sectionTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND);
    doc.text(title, marginX, cursorY);
    cursorY += 2;
  };

  const afterTable = () => {
    // @ts-expect-error lastAutoTable is attached by the plugin at runtime
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 10;
  };

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > doc.internal.pageSize.getHeight() - 14) {
      doc.addPage();
      cursorY = 16;
    }
  };

  // --- Par statut / priorité ---
  ensureSpace(50);
  sectionTitle("Répartition par statut");
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [["Statut", "Nombre"]],
    body: Object.entries(data.byStatus).map(([status, count]) => [STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status, String(count)]),
    headStyles: { fillColor: [...BRAND], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [246, 249, 252] },
  });
  afterTable();

  ensureSpace(50);
  sectionTitle("Répartition par priorité");
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [["Priorité", "Nombre"]],
    body: Object.entries(data.byPriority).map(([name, count]) => [name, String(count)]),
    headStyles: { fillColor: [...BRAND], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [246, 249, 252] },
  });
  afterTable();

  // --- Par société ---
  if (data.byCompany.length > 0) {
    ensureSpace(60);
    sectionTitle("Statistiques par société (base de facturation)");
    autoTable(doc, {
      startY: cursorY + 3,
      margin: { left: marginX, right: marginX },
      head: [["Société", "Total", "Ouverts", "Résolus", "En retard", "Résolution moy.", "Temps total"]],
      body: data.byCompany.map((c) => [
        c.name,
        String(c.total),
        String(c.open),
        String(c.resolved),
        String(c.overdue),
        formatHours(c.avgResolutionHours),
        formatDuration(c.totalElapsedHours),
      ]),
      headStyles: { fillColor: [...BRAND], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [246, 249, 252] },
      columnStyles: { 6: { fontStyle: "bold" } },
    });
    afterTable();
  }

  // --- Par agent ---
  if (data.byAgent.length > 0) {
    ensureSpace(60);
    sectionTitle("Statistiques par agent");
    autoTable(doc, {
      startY: cursorY + 3,
      margin: { left: marginX, right: marginX },
      head: [["Agent", "Total", "Ouverts", "Résolus", "En retard", "Résolution moy.", "Temps total"]],
      body: data.byAgent.map((a) => [
        a.name,
        String(a.total),
        String(a.open),
        String(a.resolved),
        String(a.overdue),
        formatHours(a.avgResolutionHours),
        formatDuration(a.totalElapsedHours),
      ]),
      headStyles: { fillColor: [...BRAND], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [246, 249, 252] },
    });
    afterTable();
  }

  // --- Par utilisateur ---
  if (data.byUser.length > 0) {
    ensureSpace(60);
    sectionTitle("Statistiques par utilisateur");
    autoTable(doc, {
      startY: cursorY + 3,
      margin: { left: marginX, right: marginX },
      head: [["Utilisateur", "Total", "Ouverts", "Résolus", "En retard", "Temps total"]],
      body: data.byUser.map((u) => [
        u.name,
        String(u.total),
        String(u.open),
        String(u.resolved),
        String(u.overdue),
        formatDuration(u.totalElapsedHours),
      ]),
      headStyles: { fillColor: [...BRAND], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [246, 249, 252] },
    });
    afterTable();
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text("ITicket — Meninx Holding", marginX, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - marginX - 20, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`tableau-de-bord-${now.toISOString().slice(0, 10)}.pdf`);
}
