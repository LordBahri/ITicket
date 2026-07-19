import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export function TopProgressBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const active = isFetching + isMutating > 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] h-0.5 overflow-hidden">
      {active && <div className="animate-progress-indeterminate h-full w-1/3 bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
    </div>
  );
}
