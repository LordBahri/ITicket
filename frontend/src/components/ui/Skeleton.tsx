export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md bg-slate-100 ${className}`} />;
}

export function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}
