import {
  formatBytes,
  storageRemainingLabel,
  storageUsedPercent,
  cn,
} from "@/lib/utils";

type StorageMeterProps = {
  usedBytes: string;
  limitBytes: string;
  usedPercent: number;
  className?: string;
};

function formatUsedPercent(percent: number, usedBytes: string): string {
  if (Number(usedBytes) > 0 && percent > 0 && percent < 1) {
    return "1";
  }
  if (percent > 0 && percent < 10) {
    return percent.toFixed(1).replace(/\.0$/, "");
  }
  return String(Math.round(percent));
}

export function StorageMeter({
  usedBytes,
  limitBytes,
  usedPercent,
  className,
}: StorageMeterProps) {
  const precisePercent = storageUsedPercent(usedBytes, limitBytes);
  const clamped = Math.min(100, Math.max(0, precisePercent || usedPercent));
  const warn = clamped >= 80;

  return (
    <div
      className={cn(
        "panel-3d px-3 py-2.5 lg:px-3.5 lg:py-3",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-semibold text-charcoal-900 lg:text-xl">
          {formatUsedPercent(clamped, usedBytes)}%
          <span className="ml-1.5 text-sm font-semibold text-charcoal-900">
            Storage
          </span>
        </p>
        <p className="text-right text-[11px] text-charcoal-900 lg:text-xs">
          {storageRemainingLabel(usedBytes, limitBytes)}
        </p>
      </div>
      <p className="mt-0.5 text-[11px] text-stone-400 lg:text-xs">
        {formatBytes(usedBytes)} of {formatBytes(limitBytes)} used
      </p>
      <div
        className="mx-auto mt-2 h-1 w-[90%] overflow-hidden rounded-full bg-[#d8cec2] lg:mt-2.5 lg:h-1.5"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            warn ? "bg-[#a67c52]" : "bg-[#c4a574]",
          )}
          style={{
            width: `${Math.max(clamped, Number(usedBytes) > 0 ? 0.5 : 0)}%`,
          }}
        />
      </div>
    </div>
  );
}
