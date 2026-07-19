import { Card } from "./ui/Card";
import { STATUS_LABELS, STATUS_BAR_COLORS } from "../constants/ticketStatus";
import type { TicketStatusHistoryEntry } from "../types";

export function TicketStatusTimeline({ entries }: { entries: TicketStatusHistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card className="mb-4 p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Progression du ticket</h2>
      <ol>
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1;
          return (
            <li
              key={entry.id}
              className="animate-fade-in relative flex gap-3 pb-6 last:pb-0"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            >
              {!isLast && <span className="absolute left-[5px] top-3 h-full w-px bg-slate-200" />}
              <span className="relative mt-1 flex h-3 w-3 shrink-0 items-center justify-center">
                {isLast && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${STATUS_BAR_COLORS[entry.status]} opacity-60`} />
                )}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${STATUS_BAR_COLORS[entry.status]}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{STATUS_LABELS[entry.status]}</p>
                <p className="text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString("fr-FR")}
                  {entry.changedBy && <> · {entry.changedBy.name}</>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
