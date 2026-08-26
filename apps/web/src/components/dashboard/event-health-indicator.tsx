import { cn } from "@/lib/utils";

type EventHealthIndicatorProps = {
  storageUsedPercent: number;
  className?: string;
};

export function EventHealthIndicator({
  storageUsedPercent,
  className,
}: EventHealthIndicatorProps) {
  const nearLimit = storageUsedPercent >= 80;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        nearLimit
          ? "bg-amber-500/15 text-amber-600"
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
