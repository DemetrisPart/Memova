import { cn } from "@/lib/utils";

type EventHealthIndicatorProps = {
  storageUsedPercent: number;
  className?: string;
  onLime?: boolean;
};

export function EventHealthIndicator({
  storageUsedPercent,
  className,
  onLime = false,
}: EventHealthIndicatorProps) {
  const nearLimit = storageUsedPercent >= 80;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide sm:gap-2 sm:px-3 sm:text-xs",
        nearLimit
          ? "bg-amber-500/25 text-amber-900"
          : onLime
            ? "bg-[#2e2a24]/35 text-[#1a1714]"
            : "bg-emerald-600/10 text-emerald-700",
        className,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          nearLimit ? "bg-amber-500" : "guest-access-dot",
        )}
        aria-hidden
      />
      {nearLimit ? "Near storage limit" : "Active"}
    </span>
  );
}
