export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.max(0, Math.round(hours * 60))} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return remHours > 0 ? `${days} j ${remHours} h` : `${days} j`;
}
