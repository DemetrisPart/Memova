import { formatBytes, storageRemainingLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

type StorageMeterProps = {
  usedBytes: string;
  limitBytes: string;
  usedPercent: number;
  className?: string;
};

export function StorageMeter({
  usedBytes,
  limitBytes,
  usedPercent,
  className,
}: StorageMeterProps) {
  const clamped = Math.min(100, Math.max(0, usedPercent));
  const warn = clamped >= 80;

  return (
    <div
      className={cn(
        "rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-soft lg:rounded-2xl lg:px-4 lg:py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 lg:gap-4">
        <div>
          <p className="text-xs font-medium text-stone-400 lg:text-sm">
            Storage
          </p>
          <p className="mt-0.5 text-lg font-semibold text-charcoal-900 lg:text-xl">
            {clamped}%
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400 lg:text-xs">
            {formatBytes(usedBytes)} of {formatBytes(limitBytes)} used
          </p>
        </div>
        <p className="text-right text-[11px] text-stone-400 lg:text-xs">
          {storageRemainingLabel(usedBytes, limitBytes)}
        </p>
      </div>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ivory-100 lg:mt-3 lg:h-2"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            warn ? "bg-amber-500" : "bg-gold-600",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
