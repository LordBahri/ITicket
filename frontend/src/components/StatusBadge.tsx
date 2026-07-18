import type { TicketStatus } from "../types";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "../constants/ticketStatus";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
