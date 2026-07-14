import type { Priority } from "../types";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${priority.color}20`, color: priority.color }}
    >
      {priority.name}
    </span>
  );
}
