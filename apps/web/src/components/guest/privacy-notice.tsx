"use client";

import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "momeva_privacy_notice_dismissed";

export function dismissPrivacyNotice(slug: string): void {
  sessionStorage.setItem(`${DISMISS_KEY}_${slug}`, "1");
}

export function PrivacyNoticeBanner({
  slug,
  dismissed,
  onDismiss,
  className,
}: {
  slug: string;
  dismissed: boolean;
  onDismiss: () => void;
  className?: string;
}) {
  if (dismissed) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-0 bg-[#efe8dc] p-4 shadow-[0_4px_16px_rgb(0_0_0_/_12%)]${className ? ` ${className}` : ""}`}
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-[#8a6a3f]" aria-hidden />
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1a1714]">
          My uploads are private unless the couple enables shared gallery.
        </p>
        <p className="mt-1 text-xs text-[#5c4a32]">
          You&apos;ll only see what you upload.
        </p>
      </div>
      <Button
        variant="ghost"
        className="min-h-8 px-2 text-[#5c4a32] hover:bg-[#e4d9cb] hover:text-[#1a1714]"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
